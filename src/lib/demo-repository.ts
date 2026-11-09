import {fixtures,type DemoState} from './demo';
export const DemoRepository={
 load():DemoState {try{const value=localStorage.getItem('ia-demo-v1');if(value){const parsed=JSON.parse(value) as DemoState;if(Array.isArray(parsed.notes)&&Array.isArray(parsed.companies)&&Array.isArray(parsed.drafts))return parsed;}}catch{}return fixtures()},
 save(state:DemoState){localStorage.setItem('ia-demo-v1',JSON.stringify(state))},
 reset:fixtures,
};
