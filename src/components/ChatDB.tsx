'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Loader2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  data?: any;
  sql?: string;
}

export function ChatDB() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Përshëndetje! Unë jam asistenti juaj inteligjent. Më pyet diçka rreth bazës së të dhënave tuaja (p.sh. "Sa është totali i shitjeve sot?").' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      const result = await response.json();

      if (result.error) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Gabim teknik: ${result.error}`,
          sql: result.sql 
        }]);
      } else {
        const content = result.content || (result.data ? "Gjeta këto të dhëna:" : "Nuk kam një përgjigje për këtë.");
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content,
          data: result.data,
          sql: result.sql
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ndodhi një gabim gjatë komunikimit me serverin.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <Card className="w-[380px] h-[500px] mb-4 flex flex-col shadow-2xl border-primary/20 bg-background/95 backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300">
          <CardHeader className="p-4 border-b bg-primary/5 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              Asistenti Inteligjent (Chat with DB)
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex flex-col", m.role === 'user' ? "items-end" : "items-start")}>
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                  m.role === 'user' 
                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                    : "bg-muted text-muted-foreground rounded-tl-none"
                )}>
                  <p>{m.content}</p>
                  {m.data && Array.isArray(m.data) && m.data.length > 0 && (
                    <div className="mt-2 overflow-x-auto text-[10px] bg-black/10 p-2 rounded">
                      <table className="w-full text-left">
                        <thead>
                          <tr>
                            {Object.keys(m.data[0]).map(k => <th key={k} className="pr-2 font-bold">{k}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {m.data.slice(0, 3).map((row, ri) => (
                            <tr key={ri}>
                              {Object.values(row).map((v: any, vi) => <td key={vi} className="pr-2">{String(v)}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {m.data.length > 3 && <p className="mt-1 opacity-50">+ edhe {m.data.length - 3} tjerë...</p>}
                    </div>
                  )}
                </div>
                {m.role === 'assistant' && m.sql && (
                   <div className="mt-1 flex flex-col gap-1">
                     <span className="text-[9px] text-muted-foreground flex items-center gap-1 opacity-70">
                       <Database className="w-2 h-2" /> SQL e gjeneruar:
                     </span>
                     <code className="text-[8px] bg-black/5 p-1 rounded font-mono break-all opacity-50 hover:opacity-100 transition-opacity">
                       {m.sql}
                     </code>
                   </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs italic">
                <Loader2 className="w-3 h-3 animate-spin" />
                Duke analizuar dhënat...
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>
          <div className="p-4 border-t bg-background">
            <div className="flex gap-2">
              <Input
                placeholder="Shkruaj pyetjen këtu..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1"
              />
              <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      <Button 
        size="icon" 
        className={cn(
          "h-14 w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95",
          isOpen ? "bg-destructive text-destructive-foreground rotate-90" : "bg-primary text-primary-foreground"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </Button>
    </div>
  );
}
