const configuracao = {
  test: { pool: 'threads', maxWorkers: 1, fileParallelism: false, include: ['src/server/**/*.test.ts'] },
};
export default configuracao;
