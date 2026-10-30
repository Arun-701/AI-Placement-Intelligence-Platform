export const normalizeDepartment = (department) =>
  String(department || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
