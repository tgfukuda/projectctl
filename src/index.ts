#!/usr/bin/env ts-node
import { Command } from 'commander';
import { editConfig, listProjects, startProject, stopProject, validateConfig } from './commands';

const program = new Command();

program.name('projectctl').description('プロジェクト環境の自動起動・管理ツール').version('1.0.0');

// プロジェクト起動コマンド
program
  .command('start')
  .description('プロジェクトを起動します')
  .argument('<project-name>', '起動するプロジェクト名')
  .option('-f, --force', '強制的に起動（既存のプロセスを終了）')
  .option('-d, --debug', 'デバッグモードで起動')
  .action(async (projectName: string, options: { force?: boolean; debug?: boolean }) => {
    try {
      await startProject(projectName, options);
    } catch (error) {
      console.error('プロジェクトの起動に失敗しました:', error);
      process.exit(1);
    }
  });

// プロジェクト停止コマンド
program
  .command('stop')
  .description('プロジェクトを停止します')
  .argument('<project-name>', '停止するプロジェクト名')
  .option('-f, --force', '強制的に停止')
  .action(async (projectName: string, options: { force?: boolean }) => {
    try {
      await stopProject(projectName, options);
    } catch (error) {
      console.error('プロジェクトの停止に失敗しました:', error);
      process.exit(1);
    }
  });

// プロジェクト一覧コマンド
program
  .command('list')
  .description('プロジェクトの一覧を表示します')
  .option('-a, --all', 'すべてのプロジェクトを表示')
  .option('-s, --status', '実行状態も表示')
  .action(async (options: { all?: boolean; status?: boolean }) => {
    try {
      await listProjects(options);
    } catch (error) {
      console.error('プロジェクト一覧の取得に失敗しました:', error);
      process.exit(1);
    }
  });

// 設定編集コマンド
program
  .command('edit')
  .description('設定ファイルを編集します')
  .option('-f, --file <path>', '編集する設定ファイルのパス')
  .action(async (options: { file?: string }) => {
    try {
      await editConfig(options);
    } catch (error) {
      console.error('設定の編集に失敗しました:', error);
      process.exit(1);
    }
  });

// 設定検証コマンド
program
  .command('validate')
  .description('設定ファイルを検証します')
  .option('-f, --file <path>', '検証する設定ファイルのパス')
  .action(async (options: { file?: string }) => {
    try {
      await validateConfig(options);
    } catch (error) {
      console.error('設定の検証に失敗しました:', error);
      process.exit(1);
    }
  });

// 設定初期化コマンド
program
  .command('init')
  .description('新しい設定ファイルを作成します')
  .option('-t, --template <name>', '使用するテンプレート名')
  .action(async (_: { template?: string }) => {
    try {
      // TODO: 実装
      console.log('設定の初期化機能は未実装です');
    } catch (error) {
      console.error('設定の初期化に失敗しました:', error);
      process.exit(1);
    }
  });

// ヘルプコマンドのカスタマイズ
program.addHelpText(
  'after',
  `
使用例:
  $ projectctl start my-project
  $ projectctl stop my-project
  $ projectctl list
  $ projectctl edit
  $ projectctl validate
  $ projectctl init

詳細な情報は https://github.com/yourusername/projectctl を参照してください。
`
);

// エラーハンドリング
program.configureOutput({
  writeOut: (str) => process.stdout.write(str),
  writeErr: (str) => process.stderr.write(str),
  getOutHelpWidth: () => process.stdout.columns || 80,
  getErrHelpWidth: () => process.stderr.columns || 80,
});

// コマンドライン引数の解析
program.parse(process.argv);
