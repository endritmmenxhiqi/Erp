'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Bot, Database, Loader2, MessageSquare, RotateCcw, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const MAX_CHAT_LENGTH = 500;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  data?: Record<string, unknown>[] | null;
  sql?: string | null;
}

export function ChatDB() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Pershendetje! Une jam asistenti juaj inteligjent. Me pyet dicka rreth bazes se te dhenave tuaja, p.sh. "Sa eshte totali i shitjeve sot?".',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastPrompt, setLastPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (rawMessage?: string) => {
    if (isLoading) return;

    const userMessage = (rawMessage ?? input).trim();
    if (!userMessage) {
      setErrorMessage('Shkruani nje pyetje para se te dergoni mesazhin.');
      return;
    }

    if (userMessage.length > MAX_CHAT_LENGTH) {
      setErrorMessage(`Pyetja eshte shume e gjate. Kufiri eshte ${MAX_CHAT_LENGTH} karaktere.`);
      return;
    }

    setErrorMessage('');
    setLastPrompt(userMessage);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15000);

      const response = await fetch('/api/chat-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);

      let result: {
        error?: string;
        content?: string;
        data?: Record<string, unknown>[];
        sql?: string;
      } | null = null;

      try {
        result = await response.json();
      } catch {
        throw new Error('Serveri ktheu nje pergjigje te pavlefshme.');
      }

      if (!response.ok || result?.error) {
        throw new Error(result?.error || 'Kerkesa deshtoi. Ju lutem provoni perseri.');
      }

      const content =
        result.content || (Array.isArray(result.data) && result.data.length > 0 ? 'Gjeta keto te dhena:' : 'Nuk kam nje pergjigje per kete.');

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content,
          data: result.data ?? null,
          sql: result.sql ?? null,
        },
      ]);
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Kerkesa po zgjat shume. Kontrolloni rrjetin dhe provoni perseri.'
          : error instanceof Error
            ? error.message
            : 'Ndodhi nje gabim gjate komunikimit me serverin.';

      setErrorMessage(message);
      setMessages((prev) => [...prev, { role: 'assistant', content: message }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <Card className="mb-4 flex h-[500px] w-[380px] flex-col border-primary/20 bg-background/95 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-primary/5 p-4">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Bot className="h-4 w-4 text-primary" />
              Asistenti Inteligjent (Chat with DB)
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 space-y-4 overflow-y-auto p-4">
            {errorMessage && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={cn('flex flex-col', message.role === 'user' ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-2 text-sm',
                    message.role === 'user'
                      ? 'rounded-tr-none bg-primary text-primary-foreground'
                      : 'rounded-tl-none bg-muted text-muted-foreground'
                  )}
                >
                  <p>{message.content}</p>
                  {Array.isArray(message.data) && message.data.length > 0 && (
                    <div className="mt-2 overflow-x-auto rounded bg-black/10 p-2 text-[10px]">
                      <table className="w-full text-left">
                        <thead>
                          <tr>
                            {Object.keys(message.data[0]).map((key) => (
                              <th key={key} className="pr-2 font-bold">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {message.data.slice(0, 3).map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {Object.values(row).map((value, valueIndex) => (
                                <td key={valueIndex} className="pr-2">
                                  {String(value)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {message.data.length > 3 && <p className="mt-1 opacity-50">+ edhe {message.data.length - 3} te tjera...</p>}
                    </div>
                  )}
                </div>

                {message.role === 'assistant' && message.sql && (
                  <div className="mt-1 flex flex-col gap-1">
                    <span className="flex items-center gap-1 text-[9px] text-muted-foreground opacity-70">
                      <Database className="h-2 w-2" /> SQL e gjeneruar:
                    </span>
                    <code className="break-all rounded bg-black/5 p-1 font-mono text-[8px] opacity-50 transition-opacity hover:opacity-100">
                      {message.sql}
                    </code>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs italic text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Duke analizuar te dhenat...
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>
          <div className="border-t bg-background p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Shkruaj pyetjen ketu..."
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void sendMessage();
                  }
                }}
                className="flex-1"
                maxLength={MAX_CHAT_LENGTH}
              />
              <Button size="icon" onClick={() => void sendMessage()} disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{input.length}/{MAX_CHAT_LENGTH} karaktere</span>
              {lastPrompt && !isLoading && (
                <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => void sendMessage(lastPrompt)}>
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Provo perseri
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      <Button
        size="icon"
        className={cn(
          'h-14 w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95',
          isOpen ? 'rotate-90 bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </Button>
    </div>
  );
}
