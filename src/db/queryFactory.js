'use strict';

module.exports = function queryFactory(
  errors,
  knex
) {
  return {
    transact:                      transact,
    createRawQuery:                createRawQuery,
    createTransactionlessRawQuery: createTransactionlessRawQuery,
    createTableQuery:              createTableQuery,
    call:                          call
  };

  // ---

  /**
   * Runs the given function inside of a transaction
   *
   * @param {Object} context
   * @param {Object} action Function to execute inside the transaction.
   * The function should return a promise. If the promise is
   * fulfilled, then the transaction is committed. If the promise
   * is rejected, then the transaction is aborted. If the function
   * throws an exception, then the transaction is aborted and the
   * exception is rethrown. Function should return a promise.
   *
   * @returns {Promise} Promise for the action completion.
   */
  function transact(context, action) {
    if (context.transaction) {
      // Transaction is now available, use it
      return action();
    }

    // No transaction running now, create a new one
    return knex.transaction(function (tx) {
      // If another async code path has set the transaction then
      // we must throw, or we won't know when to commit/rollback
      // the transaction. Callers MUST declare the transaction
      // at the outermost point in the call stack.
      if (context.transaction) {
        throw new errors.app.ConcurrentTransactionError();
      }

      context.transaction = tx;

      return action();
    })
    .finally(function () {
      // Clear out the transaction from the context!
      context.transaction = null;
    });
  }

  function createRawQuery(context, sql, bindings) {
    return wrapInTransaction(context, knex.raw(sql, bindings));
  }

  function createTransactionlessRawQuery(context, sql, bindings) {
    return knex.raw(sql, bindings);
  }

  /**
   * Checks the domain context for an active transaction and if one is found,
   * enlists the query in that transaction.
   *
   * @param {Object} context
   * @param {String} tableName The table to query
   *
   * @returns {Object} The created query
   */
  function createTableQuery(context, tableName) {
    return wrapInTransaction(context, knex(tableName));
  }

  /**
   * WARNING: This method builds a raw query. So NEVER let users specify funcName.
   * The first argument can be followed by any number of additional arguments which
   * will be passed to the function as its arguments.
   *
   * @param {String} funcName Name of the function to run
   *
   * @returns {Promise} Promise for the completion of the function call
   */
  function call(funcName) {
    // Sanity check funcName, just because SQL injection is so dangerous.
    if (/[^\w]/.test(funcName)) {
      throw new Error('"' + funcName + '" is not an allowed function name');
    }

    // Build up the function call bindings.
    var params       = Array.prototype.slice.call(arguments, 1);
    var placeholders = params.map(function () { return '?'; }).join(',');

    return knex.raw('SELECT "' + funcName + '"(' + placeholders + ')', params);
  }

  // ---

  /**
   * Ensures that if a transaction is currently running, then the query
   * will be enlisted in it.
   *
   * @returns {Object} The passed-in query, possibly wrapped in a tx.
   */
  function wrapInTransaction(context, query) {
    return context.transaction ? query.transacting(context.transaction) : query;
  }
};
