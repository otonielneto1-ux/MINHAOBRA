// O sistema nasce preparado para mais de uma obra: todo registro tem `obra_id`.
// A camada de dados filtra por aqui; as telas nunca filtram por obra sozinhas.

export function daObra(lista, obraId) {
  return lista.filter((item) => item.obra_id === obraId)
}
