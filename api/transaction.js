'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.add = (event, context, callback) => {
    const requestBody = JSON.parse(event.body);
    const description = requestBody.desc;
    const category = requestBody.category;
    const amount = requestBody.amount;
    const date = Date.parse(requestBody.date);
    const isPending = requestBody.isPending;
    const account = requestBody.account;

    if (typeof description !== 'string'
        || typeof category !== 'string'
        || typeof account !== 'string'
        || typeof isPending !== 'boolean'
        || date instanceof Date
        || typeof amount !== 'number') {
        console.error('Validation Failed');
        callback(new Error('Couldn\'t add transaction because of validation errors.'));
        return;
    }

    addTransaction(transactionInfo(description, category, amount, date, isPending, account))
        .then(res => {
            callback(null, {
                statusCode: 200,
                body: JSON.stringify({
                    message: `Successfully added transaction ${description}`,
                    transactionId: res.id
                })
            });
        })
        .catch(err => {
            console.log(err);
            callback(null, {
                statusCode: 500,
                body: JSON.stringify({
                    message: `Unable to add transaction ${description}`
                })
            })
        });
};

module.exports.list = (event, context, callback) => {
    var params = {
        TableName: process.env.TRANSACTION_TABLE,
        ProjectionExpression: "id, desc, category, amount, date, isPending, account"
    };

    console.log("Scanning Transactions table.");
    const onScan = (err, data) => {

        if (err) {
            console.log('Scan failed to load data. Error JSON:', JSON.stringify(err, null, 2));
            callback(err);
        } else {
            console.log("Scan succeeded.");
            return callback(null, {
                statusCode: 200,
                body: JSON.stringify({
                    transactions: data.Items
                })
            });
        }

    };

    dynamoDb.scan(params, onScan);

};


const addTransaction = transaction => {
    console.log('Submitting transaction');
    const transactionInfo = {
        TableName: process.env.TRANSACTION_TABLE,
        Item: transaction,
    };
    return dynamoDb.put(transactionInfo).promise()
        .then(res => transaction);
};

const transactionInfo = (desc, category, amount, date, isPending, account) => {
    return {
        id: uuid.v1(),
        desc: desc,
        category: category,
        amount: amount,
        date: date,
        isPending: isPending,
        account: account,
    };
};