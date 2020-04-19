import path from 'path';
import fs from 'fs';
import csvParse from 'csv-parse';
import { getRepository, getCustomRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import uploadConfig from '../config/upload';
import AppError from '../errors/AppError';
import Category from '../models/Category';
import TransactionRepository from '../repositories/TransactionsRepository';
import CreateTransactionService from './CreateTransactionService';

interface Request {
  importFilename: string;
}

interface TransactionFile {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute({ importFilename }: Request): Promise<Transaction[]> {
    const createTransactionService = new CreateTransactionService();

    const importFilePath = path.join(uploadConfig.directory, importFilename);
    const importFileExists = await fs.promises.stat(importFilePath);

    if (!importFileExists) {
      throw new AppError('File not found');
    }

    const transactionsList: TransactionFile[] = [];

    const transactionsFile = fs.createReadStream(importFilePath);
    const transactionsCSV = transactionsFile.pipe(
      csvParse({ delimiter: ',', from_line: 2 }),
    );

    transactionsCSV.on('data', async line => {
      let [title, type, value, category] = line;

      title = title.trim();
      type = type.trim();
      value = Number(value.trim());
      category = category.trim();

      transactionsList.push({ title, type, value, category });
    });

    await new Promise(resolve => transactionsCSV.on('end', resolve));

    await fs.promises.unlink(importFilePath);

    const categoryRepository = getRepository(Category);
    const transactionRepository = getCustomRepository(TransactionRepository);

    const transactions: Transaction[] = [];

    for (const item of transactionsList) {
      let transactionCategory = await categoryRepository.findOne({
        where: { title: item.category },
      });

      if (!transactionCategory) {
        transactionCategory = categoryRepository.create({
          title: item.category,
        });
        await categoryRepository.save(transactionCategory);
      }

      const t = transactionRepository.create({
        title: item.title,
        value: item.value,
        type: item.type,
        category_id: transactionCategory.id,
      });

      transactions.push(t);
    }

    // transactionsList.map(async transaction => {
    //   let transactionCategory = await categoryRepository.findOne({
    //     where: { title: transaction.category },
    //   });

    //   if (!transactionCategory) {
    //     transactionCategory = categoryRepository.create({
    //       title: transaction.category,
    //     });
    //     await categoryRepository.save(transactionCategory);
    //   }

    //   const t = transactionRepository.create({
    //     title: transaction.title,
    //     value: transaction.value,
    //     type: transaction.type,
    //     category_id: transactionCategory.id,
    //   });

    //   transactions.push(t);
    // });

    await transactionRepository.save(transactions);

    console.log(transactions);

    return transactions;
  }
}

export default ImportTransactionsService;
