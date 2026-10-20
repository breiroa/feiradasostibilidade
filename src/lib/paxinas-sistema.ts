// Contido por defecto das páxinas fixas (úsase só se aínda non existen na base de datos).
// O mesmo JSON úsao scripts/migrar-paxinas.mjs para crealas.
import datos from '../data/paxinas-sistema.json';
import type { PaxinaLibre } from './esquemas';

export const paxinasPorDefecto = datos as unknown as Record<'inicio' | 'feiralab' | 'participa' | 'actualidade' | 'recursos' | 'edicions', Omit<PaxinaLibre, 'id'>>;
