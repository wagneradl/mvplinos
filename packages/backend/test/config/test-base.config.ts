export const testConfig = {
  pagination: {
    defaultPageSize: 10,
    maxPageSize: 100
  },
  validation: {
    status: ['ativo', 'inativo'] as const,
    produto: {
      nome: {
        minLength: 1,
        maxLength: 255
      },
      preco_unitario: {
        min: 0
      }
    }
  },
  errorMessages: {
    notFound: (entity: string, id: number) => `${entity} com ID ${id} não encontrado`,
    validation: {
      required: (field: string) => `${field} should not be empty`,
      minValue: (field: string, min: number) => `${field} must not be less than ${min}`,
      invalidStatus: 'status must be one of the following values: ativo, inativo'
    }
  }
};
