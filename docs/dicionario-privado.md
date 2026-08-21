# Dicionário privado para estudo

Esta área é destinada a obras de referência que você possui e usa no seu computador. Ela não transforma um dicionário comercial em conteúdo público.

## Depois de fazer pull

1. Inicie o PostgreSQL usado pelo projeto e inicie a API e o web app pelos workflows ou comandos existentes.
2. Inicie o Ollama localmente, com um modelo já baixado.
3. Abra **Dicionário** na aplicação e importe um arquivo `.epub`.
4. Informe os metadados que deseja manter e confirme que a fonte é para uso pessoal e privado.

O arquivo EPUB é lido em memória para extrair os verbetes e não é salvo no banco ou no repositório. Pastas `private-data/` e `private-dictionaries/` ficam ignoradas pelo Git para permitir que você guarde suas cópias locais fora do controle de versão.

## Limites de privacidade

- A importação aceita apenas EPUBs de até 50 MB.
- O banco armazena a fonte, entradas, sentidos, exemplos gerados e cartões derivados; ele não armazena o EPUB original.
- A geração de frases aceita somente o provedor Ollama em `localhost`, `127.0.0.1` ou `::1`.
- O OpenRouter é bloqueado para essa fonte privada.
- As frases dos cartões são geradas sob demanda e devem ser originais; não são exemplos copiados da obra.
- O aplicativo mobile deve receber somente cartões derivados, não o conteúdo completo do dicionário.

## Formato inicial suportado

O importador é tolerante com EPUBs cujo texto extraído apresente entradas em uma destas formas:

```text
break the ice — quebrar o gelo; iniciar uma conversa

look after
cuidar de; tomar conta de

amends: make amends (to someone) (for something / for doing something)
fazer algo para compensar, reparar um erro.
Example sentence in English. / Exemplo de tradução em português.
```

No terceiro formato, o texto antes dos dois-pontos é apenas o marcador alfabético do dicionário. O termo salvo para estudo é a expressão em inglês depois dos dois-pontos — por exemplo, `make amends` — sem as notas opcionais entre parênteses. O sentido completo e a tradução são preservados, enquanto a frase bilíngue original não é copiada para os cartões.

O marcador alfabético também é preservado separadamente como cabeçalho visual — por exemplo, `amends:` — sem ser confundido com o termo principal da entrada.

EPUBs com uma estrutura muito visual, em colunas ou com cada definição fragmentada em diversos elementos podem exigir evolução do normalizador. As linhas que não forem reconhecidas são informadas no resultado da importação.

O importador também reconhece abreviações de uso (`Amer`, `Brit`, `dit`, `form`, `inf`, `pop`, `comp` e `vulg`) e as mantém como metadados do verbete. Em entradas com sentidos numerados, cada tradução é armazenada como um sentido separado e na ordem original.

Exemplos bilíngues do EPUB são reconhecidos para não serem confundidos com traduções ou novos verbetes, mas não são persistidos nem sincronizados. A tela pode gerar exemplos originais usando o Ollama local.