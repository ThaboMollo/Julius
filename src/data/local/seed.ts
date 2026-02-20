import { db } from './db'
import { budgetGroupRepo } from './BudgetGroupRepo.dexie'
import { categoryRepo } from './CategoryRepo.dexie'
import { settingsRepo } from './SettingsRepo.dexie'
import { DEFAULT_GROUPS, DEFAULT_CATEGORIES } from '../../domain/constants'

export async function seedDefaults(): Promise<void> {
  const groupMap = new Map<string, string>()

  // Seed each default group only if one with that name doesn't already exist
  for (const groupDef of DEFAULT_GROUPS) {
    const existing = await db.budgetGroups.where('name').equals(groupDef.name).first()
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

  // Seed each default category only if one with that name doesn't already exist in that group
  for (const [groupName, categoryNames] of Object.entries(DEFAULT_CATEGORIES)) {
    const groupId = groupMap.get(groupName)
    if (!groupId) continue
    for (const categoryName of categoryNames) {
      const existing = await db.categories
        .where('groupId').equals(groupId)
        .filter(c => c.name === categoryName)
        .first()
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

  // Ensure settings exist
  await settingsRepo.get()
}
