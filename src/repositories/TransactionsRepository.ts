import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const findAllIncomes = await this.find({ where: { type: 'income' } });
    const findAllOutcomes = await this.find({ where: { type: 'outcome' } });

    const income = findAllIncomes.reduce((accu, { value }) => accu + value, 0);
    const outcome = findAllOutcomes.reduce(
      (accu, { value }) => accu + value,
      0,
    );
    const balance = { income, outcome, total: income - outcome };

    return balance;
  }
}

export default TransactionsRepository;
