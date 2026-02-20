import type { BillTick, CreateBillTick } from '../../domain/models'

export interface IBillTickRepo {
  getByMonth(budgetMonthId: string): Promise<BillTick[]>
  getByMonthAndItem(budgetMonthId: string, budgetItemId: string): Promise<BillTick | undefined>
  getById(id: string): Promise<BillTick | undefined>
  create(billTick: CreateBillTick): Promise<BillTick>
  update(id: string, updates: Partial<BillTick>): Promise<void>
  togglePaid(budgetMonthId: string, budgetItemId: string): Promise<BillTick>
  delete(id: string): Promise<void>
  deleteByMonth(budgetMonthId: string): Promise<void>
}
