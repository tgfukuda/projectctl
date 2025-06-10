import ora from 'ora';

export async function withProgress<T>(
  message: string,
  action: () => Promise<T>
): Promise<T> {
  const spinner = ora(message).start();
  try {
    const result = await action();
    spinner.succeed();
    return result;
  } catch (error) {
    spinner.fail();
    throw error;
  }
}
