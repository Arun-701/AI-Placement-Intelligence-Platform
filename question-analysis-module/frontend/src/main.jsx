import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BarChart, Bar, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis, Legend} from 'recharts';
import './styles.css';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const colors=['#5b5ce2','#17a673','#f59e0b','#ea580c','#db2777'];
function App(){
 const [text,setText]=useState(''); const [file,setFile]=useState(null); const [data,setData]=useState(null); const [loading,setLoading]=useState(false); const [error,setError]=useState('');
 async function analyze(){ try {setLoading(true);setError(''); let res;
   if(file){const form=new FormData();form.append('file',file);res=await fetch(`${API}/api/analyze/file`,{method:'POST',body:form});}
   else {res=await fetch(`${API}/api/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({questions_text:text})});}
   const body=await res.json(); if(!res.ok) throw Error(body.detail||'Analysis failed'); setData(body);
  }catch(e){setError(e.message)}finally{setLoading(false)} }
 const subject=data?Object.entries(data.subjectDistribution).map(([name,value])=>({name,value})):[];
 const difficulty=data?Object.entries(data.difficultyDistribution).map(([name,value])=>({name,value})):[];
 return <main><header><span className="logo">AI</span><div><h1>Question Paper Analysis</h1><p>Find the placement topics worth studying first.</p></div></header>
 <section className="input-card"><label>Paste placement questions</label><textarea value={text} onChange={e=>{setText(e.target.value);setFile(null)}} placeholder="Paste one question per line, or numbered questions..."/><div className="actions"><label className="upload">Upload PDF / TXT<input type="file" accept=".pdf,.txt" onChange={e=>{setFile(e.target.files[0]);setText('')}}/></label><span>{file?.name}</span><button disabled={loading || (!text.trim()&&!file)} onClick={analyze}>{loading?'Analyzing...':'Analyze Questions'}</button></div>{error&&<p className="error">{error}</p>}</section>
 {data&&<><section className="summary"><div><strong>{data.totalQuestions}</strong><span>Questions analyzed</span></div><div><strong>{data.topics.length}</strong><span>Topics identified</span></div><div><strong>{data.topics[0]?.priorityScore||0}</strong><span>Top priority score</span></div></section>
 <section className="grid"><article><h2>Topic Frequency</h2><ResponsiveContainer width="100%" height={260}><BarChart data={data.topics}><XAxis dataKey="topic" hide/><YAxis/><Tooltip/><Bar dataKey="questionCount" fill="#5b5ce2" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></article><article><h2>Difficulty Distribution</h2><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={difficulty} dataKey="value" nameKey="name" outerRadius={88} label>{difficulty.map((_,i)=><Cell key={i} fill={colors[i]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer></article></section>
 <section className="table-card"><h2>Ranked Important Topics</h2><table><thead><tr><th>#</th><th>Subject</th><th>Topic</th><th>Questions</th><th>Difficulty</th><th>Score</th><th>Priority</th></tr></thead><tbody>{data.topics.map((t,i)=><tr key={`${t.subject}${t.topic}`}><td>{i+1}</td><td>{t.subject}</td><td>{t.topic}</td><td>{t.questionCount}</td><td>{t.difficulty}</td><td><b>{t.priorityScore}</b></td><td><span className={`badge ${t.priority.replace(' ','-').toLowerCase()}`}>{t.priority}</span></td></tr>)}</tbody></table></section>
 <section className="study"><h2>Recommended Study Order</h2><ol>{data.recommendedStudyOrder.map(x=><li key={x}>{x}</li>)}</ol></section></>}
 </main> } createRoot(document.getElementById('root')).render(<App/>);
