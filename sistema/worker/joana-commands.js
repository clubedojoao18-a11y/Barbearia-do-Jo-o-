function compactList(items,format){let result='',count=0;for(const [index,item]of items.entries()){const line=format(item,index);if(result.length+line.length>2000)break;result+=(result?'\n':'')+line;count++}return result+(count<items.length?'\nVeja os demais itens no painel ao lado.':'')}
// Personal commands run inside the same encrypted state and request lock as chat.
// Only the current message is parsed; saved text can never become a command.
export function joanaCommand(text,data,h){
 let match=text.match(/^(?:joana[,!:]?\s*)?(?:lembre que|lembre-se que|guarde na mem[oó]ria\s*:?)\s+([\s\S]+)$/i);
 if(match){const value=match[1].trim();if(value.length>400)throw h.err('Use até 400 caracteres para uma memória.');if(data.memories.length>=15)throw h.err('Limite de 15 memórias. Remova uma antiga.',409);if(!data.memories.some(m=>m.text===value))data.memories.push({id:crypto.randomUUID(),text:value,at:h.now()});return {reply:'Chefe, guardei na memória: '+value,page:null}}
 match=text.match(/^(?:joana[,!:]?\s*)?(?:adicione|crie|anote)\s+(?:uma\s+)?tarefa\s*:\s*([\s\S]+)$/i);
 if(match){let value=match[1].trim(),date=null;const suffix=value.match(/\s+em\s+(\d{4}-\d{2}-\d{2})$/);if(suffix){date=suffix[1];value=value.slice(0,suffix.index).trim();if(!h.validDate(date))throw h.err('Revise a data da tarefa.')}if(!value||value.length>250)throw h.err('Use até 250 caracteres para uma tarefa.');if(data.tasks.length>=20)throw h.err('Limite de 20 tarefas. Remova uma antiga.',409);data.tasks.push({id:crypto.randomUUID(),text:value,date,done:false,at:h.now()});return {reply:'Chefe, adicionei à sua lista: '+value+(date?' · '+date:'')+'. A tarefa não programa notificações.',page:null}}
 match=text.match(/^(?:joana[,!:]?\s*)?(conclua|concluir|reabra|reabrir)\s+(?:a\s+)?tarefa\s+(\d+)\s*[.!]?$/i);
 if(match){const task=data.tasks[Number(match[2])-1];if(!task)throw h.err('Esse número de tarefa não existe. Consulte “Minhas tarefas”.');task.done=/^concl/i.test(match[1]);return {reply:'Chefe, tarefa '+(task.done?'concluída':'reaberta')+': '+task.text,page:null}}
 if(/^(?:joana[,!:]?\s*)?(?:minhas tarefas|liste minhas tarefas)\s*[.!?]?$/i.test(text))return {reply:data.tasks.length?'Chefe, sua lista:\n'+compactList(data.tasks,(t,i)=>(i+1)+'. '+(t.done?'[concluída] ':'')+t.text+(t.date?' · '+t.date:'')):'Chefe, sua lista de tarefas está vazia.',page:null};
 if(/^(?:joana[,!:]?\s*)?(?:minhas mem[oó]rias|liste minhas mem[oó]rias)\s*[.!?]?$/i.test(text))return {reply:data.memories.length?'Chefe, suas memórias:\n'+compactList(data.memories,(m,i)=>(i+1)+'. '+m.text):'Chefe, você ainda não salvou memórias.',page:null};
 return null;
}
