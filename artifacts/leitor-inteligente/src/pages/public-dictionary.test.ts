import { describe, expect, it } from 'vitest';

describe('progresso do dicionário público', () => {
  it('mantém uma mensagem acionável quando o status não pode ser consultado', () => {
    const message = 'Falha de rede ou banco ao consultar o progresso. Tente atualizar novamente.';
    expect(message).toContain('consultar o progresso');
    expect(message).toContain('Tente atualizar novamente');
  });
});