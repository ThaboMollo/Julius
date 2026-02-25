import { db } from './db'
import { budgetGroupRepo } from './BudgetGroupRepo.dexie'
import { categoryRepo } from './CategoryRepo.dexie'
import { settingsRepo } from './SettingsRepo.dexie'
import { DEFAULT_GROUPS, DEFAULT_CATEGORIES } from '../../domain/constants'
import { activeUserId } from './scoped'

export async function seedDefaults(): Promise<void> {
  const userId = activeUserId()
  const groupMap = new Map<string, string>()

  for (const groupDef of DEFAULT_GROUPS) {
    const existing = (await db.budgetGroups.where('name').equals(groupDef.name).toArray()).find(
      (group) => group.userId === userId && group.deletedAt === null,
    )

    if (existing) {
      groupMap.set(groupDef.name, existing.id)
    } else {
      const group = await budgetGroupRepo.create({
        name: groupDef.name,
        sortOrder: groupDef.sortOrder,
        isDefault: true,
        isActive: true,
      })
      groupMap.set(groupDef.name, group.id)
    }
  }

  for (const [groupName, categoryNames] of Object.entries(DEFAULT_CATEGORIES)) {
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
          isActive: true,
        })
      }
    }
  }

  await settingsRepo.get()
}
