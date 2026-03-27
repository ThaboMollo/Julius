import type { BudgetMonth, BudgetGroup, RecurringTemplate, RecurringTemplateTargetKind } from '../../domain/models'
import {
  DEFAULT_CATEGORIES,
  DEFAULT_GROUPS,
  LEGACY_DEFAULT_CATEGORIES,
  LEGACY_DEFAULT_GROUP_RENAMES,
} from '../../domain/constants'
import { db } from './db'
import { activeUserId } from './scoped'
import { budgetGroupRepo } from './BudgetGroupRepo.dexie'
import { categoryRepo } from './CategoryRepo.dexie'
import { settingsRepo } from './SettingsRepo.dexie'
import { templateRepo } from './TemplateRepo.dexie'
import { budgetItemRepo } from './BudgetItemRepo.dexie'
import { commitmentRepo } from './CommitmentRepo.dexie'

const TECHNICAL_IMPORTS_GROUP = {
  name: 'Imports',
  sortOrder: 99,
  isDefault: true,
  isActive: false,
} as const

function generationJournalId(
  templateId: string,
  monthKey: string,
  outputKind: 'budget_item' | 'commitment',
): string {
  return `${templateId}:${monthKey}:${outputKind}`
}

function inferTemplateTargetKind(template: RecurringTemplate): RecurringTemplateTargetKind {
  return template.targetKind ?? (template.isBill ? 'commitment' : 'budget_item')
}

async function findLiveGroupByName(name: string): Promise<BudgetGroup | undefined> {
  const userId = activeUserId()
  return (await db.budgetGroups.where('name').equals(name).toArray()).find(
    (group) => group.userId === userId && group.deletedAt === null,
  )
}

export async function seedDefaults(): Promise<void> {
  const userId = activeUserId()
  const groupMap = new Map<string, string>()

  for (const legacyName of Object.keys(LEGACY_DEFAULT_GROUP_RENAMES)) {
    const targetName = LEGACY_DEFAULT_GROUP_RENAMES[legacyName as keyof typeof LEGACY_DEFAULT_GROUP_RENAMES]
    const legacy = await findLiveGroupByName(legacyName)
    const target = await findLiveGroupByName(targetName)

    if (legacy && !target) {
      await budgetGroupRepo.update(legacy.id, {
        name: targetName,
        isActive: true,
      })
    }
  }

  for (const groupDef of DEFAULT_GROUPS) {
    const existing = await findLiveGroupByName(groupDef.name)

    if (existing) {
      groupMap.set(groupDef.name, existing.id)
      if (existing.sortOrder !== groupDef.sortOrder || !existing.isActive || !existing.isDefault) {
        await budgetGroupRepo.update(existing.id, {
          sortOrder: groupDef.sortOrder,
          isActive: true,
          isDefault: true,
        })
      }
      continue
    }

    const group = await budgetGroupRepo.create({
      name: groupDef.name,
      sortOrder: groupDef.sortOrder,
      isDefault: true,
      isActive: true,
    })
    groupMap.set(groupDef.name, group.id)
  }

  const importsGroup = await findLiveGroupByName(TECHNICAL_IMPORTS_GROUP.name)
  if (!importsGroup) {
    const group = await budgetGroupRepo.create(TECHNICAL_IMPORTS_GROUP)
    groupMap.set(TECHNICAL_IMPORTS_GROUP.name, group.id)
  } else {
    groupMap.set(TECHNICAL_IMPORTS_GROUP.name, importsGroup.id)
    if (importsGroup.isActive || !importsGroup.isDefault) {
      await budgetGroupRepo.update(importsGroup.id, {
        isActive: false,
        isDefault: true,
      })
    }
  }

  const allCategoryGroups = {
    ...DEFAULT_CATEGORIES,
    ...LEGACY_DEFAULT_CATEGORIES,
  } as const

  for (const [groupName, categoryNames] of Object.entries(allCategoryGroups)) {
    const groupId = groupMap.get(groupName)
    if (!groupId) continue

    for (const categoryName of categoryNames) {
      const existing = (await db.categories.where('groupId').equals(groupId).toArray()).find(
        (category) => category.userId === userId && category.deletedAt === null && category.name === categoryName,
      )

      if (!existing) {
        await categoryRepo.create({
          name: categoryName,
          groupId,
          isDefault: true,
          isActive: groupName !== TECHNICAL_IMPORTS_GROUP.name || categoryName === 'Income',
        })
      } else if ((groupName !== TECHNICAL_IMPORTS_GROUP.name || categoryName === 'Income') && !existing.isActive) {
        await categoryRepo.update(existing.id, { isActive: true, isDefault: true })
      }
    }
  }

  await settingsRepo.get()
}

export async function ensureMonthBootstrap(month: BudgetMonth): Promise<void> {
  const userId = activeUserId()
  await seedDefaults()

  const templates = await templateRepo.getActive()
  if (templates.length === 0) return

  const existingItems = await budgetItemRepo.getByMonth(month.id)
  const existingCommitments = await commitmentRepo.getByMonth(month.id)

  for (const template of templates) {
    const outputKind = inferTemplateTargetKind(template)
    const journalId = generationJournalId(template.id, month.monthKey, outputKind)
    const existingJournal = await db.recurringGenerationJournal.get(journalId)
    if (existingJournal && existingJournal.userId === activeUserId() && existingJournal.deletedAt === null) {
      continue
    }

    const dueDate = template.dueDayOfMonth
      ? new Date(month.year, month.month - 1, Math.min(template.dueDayOfMonth, 28))
      : null

    if (outputKind === 'budget_item') {
      const existingItem = existingItems.find((item) => item.templateId === template.id)
      if (existingItem) {
        await db.recurringGenerationJournal.put({
          id: journalId,
          templateId: template.id,
          monthKey: month.monthKey,
          outputKind,
          generatedRecordId: existingItem.id,
          userId: activeUserId(),
          createdAt: existingItem.createdAt,
          updatedAt: existingItem.updatedAt,
          deletedAt: null,
        })
        continue
      }

      const createdItem = await budgetItemRepo.create({
        budgetMonthId: month.id,
        groupId: template.groupId,
        categoryId: template.categoryId,
        name: template.name,
        plannedAmount: template.plannedAmount,
        multiplier: template.multiplier,
        splitRatio: template.splitRatio,
        isBill: template.isBill,
        dueDate,
        isFromTemplate: true,
        templateId: template.id,
      })

      await db.recurringGenerationJournal.put({
        id: journalId,
        templateId: template.id,
        monthKey: month.monthKey,
        outputKind,
        generatedRecordId: createdItem.id,
        userId,
        createdAt: createdItem.createdAt,
        updatedAt: createdItem.updatedAt,
        deletedAt: null,
      })
      continue
    }

    const existingCommitment = existingCommitments.find((commitment) => commitment.templateId === template.id)
    if (existingCommitment) {
      await db.recurringGenerationJournal.put({
        id: journalId,
        templateId: template.id,
        monthKey: month.monthKey,
        outputKind,
        generatedRecordId: existingCommitment.id,
        userId: activeUserId(),
        createdAt: existingCommitment.createdAt,
        updatedAt: existingCommitment.updatedAt,
        deletedAt: null,
      })
      continue
    }

    const createdCommitment = await commitmentRepo.create({
      budgetMonthId: month.id,
      categoryId: template.categoryId,
      name: template.name,
      amount: template.plannedAmount * template.multiplier * template.splitRatio,
      dueDate,
      type: template.isBill ? 'bill' : 'other',
      status: 'upcoming',
      isRecurring: true,
      templateId: template.id,
      paidTransactionId: null,
      legacyBudgetItemId: null,
      notes: '',
    })

    await db.recurringGenerationJournal.put({
      id: journalId,
      templateId: template.id,
      monthKey: month.monthKey,
      outputKind,
      generatedRecordId: createdCommitment.id,
      userId,
      createdAt: createdCommitment.createdAt,
      updatedAt: createdCommitment.updatedAt,
      deletedAt: null,
    })
    existingCommitments.push(createdCommitment)
  }
}
