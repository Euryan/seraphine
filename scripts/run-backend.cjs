const { spawn } = require('child_process');

const appArgs = ['-m', 'uvicorn', '--app-dir', 'backend', 'app:app', '--reload'];
const condaEnvName = process.env.CONDA_ENV_NAME || 'seraphine';
const pythonCommand = process.env.BACKEND_PYTHON_CMD;

let command;
let args;

if (pythonCommand) {
  command = pythonCommand;
  args = appArgs;
} else if (process.env.USE_CONDA !== 'false') {
  command = 'conda';
  args = ['run', '-n', condaEnvName, '--no-capture-output', 'python', ...appArgs];
} else {
  command = 'python';
  args = appArgs;
}

if (process.argv.includes('--print-command')) {
  console.log([command, ...args].join(' '));
  process.exit(0);
}

const child = spawn(command, args, {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(`Failed to start backend with command: ${command}`);
  console.error(error.message);
  process.exit(1);
});