import { getPool } from '@/lib/database';
import { Store } from '@/types';
import { RowDataPacket } from 'mysql2';

export class StoreService {
  private pool = getPool();

  async getAllStores(): Promise<Store[]> {
    try {
      const [rows] = await this.pool.execute<RowDataPacket[]>(
        'SELECT * FROM stores ORDER BY id ASC'
      );
      return rows as Store[];
    } catch (error: unknown) {
      console.error('Erro ao buscar lojas:', error);
      throw new Error('Falha ao buscar lojas');
    }
  }

  async getActiveStores(): Promise<Store[]> {
    try {
      const [rows] = await this.pool.execute<RowDataPacket[]>(
        'SELECT * FROM stores WHERE is_active = 1 ORDER BY id ASC'
      );
      return rows as Store[];
    } catch (error: unknown) {
      console.error('Erro ao buscar lojas ativas:', error);
      throw new Error('Falha ao buscar lojas ativas');
    }
  }

  async getStoreById(id: number): Promise<Store | null> {
    try {
      const [rows] = await this.pool.execute<RowDataPacket[]>(
        'SELECT * FROM stores WHERE id = ? LIMIT 1',
        [id]
      );
      return rows.length > 0 ? (rows[0] as Store) : null;
    } catch (error: unknown) {
      console.error('Erro ao buscar loja por ID:', error);
      throw new Error('Falha ao buscar loja');
    }
  }

  async getStoreByKey(storeKey: string): Promise<Store | null> {
    try {
      const [rows] = await this.pool.execute<RowDataPacket[]>(
        'SELECT * FROM stores WHERE store_key = ? AND is_active = 1 LIMIT 1',
        [storeKey]
      );
      return rows.length > 0 ? (rows[0] as Store) : null;
    } catch (error: unknown) {
      console.error('Erro ao buscar loja por chave:', error);
      throw new Error('Falha ao buscar loja');
    }
  }

  async updateStore(id: number, data: Partial<Store>): Promise<boolean> {
    try {
      const fields = Object.keys(data).filter(key => key !== 'id');
      const values = fields.map(field => data[field as keyof Store]);
      
      if (fields.length === 0) {
        return false;
      }

      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const query = `UPDATE stores SET ${setClause}, updated_at = NOW() WHERE id = ?`;
      
      const [result] = await this.pool.execute(
        query,
        [...values, id]
      );
      
      return (result as { affectedRows: number }).affectedRows > 0;
    } catch (error: unknown) {
      console.error('Erro ao atualizar loja:', error);
      throw new Error('Falha ao atualizar loja');
    }
  }
}