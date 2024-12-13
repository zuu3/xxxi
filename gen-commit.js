import inquirer from 'inquirer';
import { execSync } from 'child_process';

async function getDefaultBranch() {
  try {
    const defaultBranch = execSync(
      'git symbolic-ref refs/remotes/origin/HEAD | sed "s@^refs/remotes/origin/@@"',
      { encoding: 'utf-8' }
    ).trim();
    return defaultBranch;
  } catch {
    return 'master';
  }
}

async function getBranchList() {
  execSync(`git fetch --all`);
  try {
    const branches = execSync('git branch -a', { encoding: 'utf-8' })
      .split('\n')
      .map((branch) => branch.replace('*', '').trim())
      .filter((branch) => branch);
    return branches;
  } catch {
    return [];
  }
}

function hasChanges() {
  try {
    const changes = execSync('git status --porcelain', { encoding: 'utf-8' });
    return changes.trim() !== '';
  } catch {
    console.error('❌ Git 상태를 확인하는 중 오류가 발생했습니다.');
    return false;
  }
}

async function genCommit() {
  const defaultBranch = await getDefaultBranch();
  const branches = await getBranchList();

  if (!hasChanges()) {
    console.log('🚫 변경된 파일이 없습니다. 커밋할 내용이 없습니다.');
    return;
  }

  const { type, scope, desc, issue, addFiles } = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: '변경 사항 유형을 선택하세요:',
      choices: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'],
    },
    {
      type: 'input',
      name: 'scope',
      message: '변경 범위를 입력하세요 (선택):',
    },
    {
      type: 'input',
      name: 'desc',
      message: '커밋 메시지를 입력하세요:',
      validate: (input) => input ? true : '커밋 메시지는 필수입니다.',
    },
    {
      type: 'input',
      name: 'issue',
      message: '연결할 이슈 번호를 입력하세요 (선택):',
    },
    {
      type: 'confirm',
      name: 'addFiles',
      message: '변경된 파일을 자동으로 추가하시겠습니까?',
      default: false,
    },
  ]);

  if (addFiles) {
    execSync('git add .');
    console.log('✔ 변경 파일이 추가되었습니다.');
  }

  const msg = `${type}${scope ? `(${scope})` : ''}: ${desc}${issue ? `\n\nFixes #${issue}` : ''}`;
  console.log(`\n생성된 커밋 메시지:\n${msg}`);

  const { confirmCommit } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmCommit',
      message: '이 메시지로 커밋하시겠습니까?',
      default: true,
    },
  ]);

  if (confirmCommit) {
    execSync(`git commit -m "${msg}"`);
    console.log('✔ 커밋이 완료되었습니다!');

    const { confirmPush, branch } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmPush',
        message: '원격 저장소로 Push 하시겠습니까?',
        default: false,
      },
      {
        type: 'list',
        name: 'branch',
        message: 'Push할 브랜치를 선택하세요:',
        choices: branches.length ? branches : [defaultBranch],
        when: (answers) => answers.confirmPush,
        default: defaultBranch,
      },
    ]);

    if (confirmPush) {
      execSync(`git push origin ${branch}`);
      console.log(`✔ ${branch} 브랜치로 Push 완료!`);
    } else {
      console.log('🚫 Push가 취소되었습니다.');
    }
  } else {
    console.log('❌ 커밋이 취소되었습니다.');
  }
}

genCommit();