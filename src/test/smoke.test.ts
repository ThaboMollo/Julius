describe('test harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })

  it('has fake-indexeddb available', () => {
    expect(typeof indexedDB).toBe('object')
    expect(indexedDB.open).toBeDefined()
  })
})
