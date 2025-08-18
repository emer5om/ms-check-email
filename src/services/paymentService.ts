import { getPool } from '@/lib/database';
import { Payment, Store, PaymentSearchResult } from '@/types';
import { RowDataPacket } from 'mysql2';
import { StoreService } from './storeService';

export class PaymentService {
  private pool = getPool();
  private storeService = new StoreService();

  async findPaymentByEmail(email: string): Promise<PaymentSearchResult> {
    try {
      // Buscar pagamento na tabela payments
      const [paymentRows] = await this.pool.execute<RowDataPacket[]>(
        `SELECT p.*, s.* FROM payments p 
         LEFT JOIN stores s ON p.store_id = s.id 
         WHERE p.customer_email = ? 
         ORDER BY p.created_at DESC 
         LIMIT 1`,
        [email]
      );

      if (paymentRows.length === 0) {
        return {
          payment: null,
          store: null,
          found: false
        };
      }

      const row = paymentRows[0];
      
      // Extrair dados do pagamento
      const payment: Payment = {
        id: row.id,
        external_id: row.external_id,
        amount: row.amount,
        status: row.status,
        customer_name: row.customer_name,
        customer_email: row.customer_email,
        customer_document: row.customer_document,
        store_id: row.store_id,
        created_at: row.created_at,
        completed_at: row.completed_at
      };

      // Extrair dados da loja (se existir)
      let store: Store | null = null;
      if (row.store_id) {
        store = {
          id: row.store_id,
          store_key: row.store_key,
          store_name: row.store_name,
          store_domain: row.store_domain,
          webhook_url: row.webhook_url,
          discord_bot_token: row.discord_bot_token,
          kupfy_api_key: row.kupfy_api_key,
          reportana_api_key: row.reportana_api_key,
          allcance_sms_key: row.allcance_sms_key,
          pix_key: row.pix_key,
          config: row.config ? JSON.parse(row.config) : {},
          is_active: row.is_active,
          created_at: row.created_at,
          updated_at: row.updated_at
        };
      } else {
        // Se não tem store_id, assumir loja padrão (ID 1)
        store = await this.storeService.getStoreById(1);
      }

      return {
        payment,
        store,
        found: true
      };
    } catch (error: unknown) {
      console.error('Erro ao buscar pagamento por email:', error);
      throw new Error('Falha ao buscar pagamento');
    }
  }

  async getRecentPayments(limit: number = 10): Promise<Payment[]> {
    try {
      const [rows] = await this.pool.execute<RowDataPacket[]>(
        'SELECT * FROM payments ORDER BY created_at DESC LIMIT ?',
        [limit]
      );
      return rows as Payment[];
    } catch (error: unknown) {
      console.error('Erro ao buscar pagamentos recentes:', error);
      throw new Error('Falha ao buscar pagamentos recentes');
    }
  }

  async getPaymentsByStore(storeId: number, limit: number = 10): Promise<Payment[]> {
    try {
      const [rows] = await this.pool.execute<RowDataPacket[]>(
        'SELECT * FROM payments WHERE store_id = ? ORDER BY created_at DESC LIMIT ?',
        [storeId, limit]
      );
      return rows as Payment[];
    } catch (error: unknown) {
      console.error('Erro ao buscar pagamentos por loja:', error);
      throw new Error('Falha ao buscar pagamentos da loja');
    }
  }

  async getPaymentById(id: number): Promise<Payment | null> {
    try {
      const [rows] = await this.pool.execute<RowDataPacket[]>(
        'SELECT * FROM payments WHERE id = ? LIMIT 1',
        [id]
      );
      return rows.length > 0 ? (rows[0] as Payment) : null;
    } catch (error: unknown) {
      console.error('Erro ao buscar pagamento por ID:', error);
      throw new Error('Falha ao buscar pagamento');
    }
  }

  async updatePaymentStatus(id: number, status: string): Promise<boolean> {
    try {
      const [result] = await this.pool.execute(
        'UPDATE payments SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, id]
      );
      return (result as { affectedRows: number }).affectedRows > 0;
    } catch (error: unknown) {
      console.error('Erro ao atualizar status do pagamento:', error);
      throw new Error('Falha ao atualizar pagamento');
    }
  }
}