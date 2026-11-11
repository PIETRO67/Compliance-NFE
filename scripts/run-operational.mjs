import {spawn} from 'node:child_process';
const action=process.argv[2]||'dev';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next',action,...(action==='dev'?['--hostname','0.0.0.0','--port',process.env.PORT||'3001']:[])],{stdio:'inherit',env:{...process.env,NEXT_PUBLIC_APP_MODE:'operational'}});
child.on('exit',code=>process.exit(code??1));
