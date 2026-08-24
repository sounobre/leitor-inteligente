# Dicionário público

O Leitor Inteligente pode importar uma base aberta derivada do Wiktionary pelo
Wiktextract/Kaikki. A base pública fica em tabelas próprias e não se mistura
com dicionários particulares importados pelo usuário.

## Importação

A API não baixa a base durante o boot. Para iniciar uma importação, execute o
servidor com a propriedade habilitada e informe a URL de um JSONL do
Wiktextract:

```bash
cd artifacts/api-server
JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java)))) \
mvn spring-boot:run \
  -Dspring-boot.run.arguments="--dictionary.import.enabled=true --dictionary.import.url=https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl.gz --dictionary.import.version=kaikki-english-2026-08-20"
```

O processo lê o `.jsonl.gz` específico do dicionário inglês em streaming,
considera apenas registros cujo `lang_code` é `en`, grava definições, formas e
sons em lotes de 500 registros e usa identificadores estáveis. Executar a
mesma versão novamente atualiza as linhas existentes sem criar duplicatas.

O arquivo completo tem centenas de megabytes compactados. Faça a importação em
um ambiente com espaço suficiente e não a execute em cada inicialização do
serviço. Após cada lote confirmado, a API grava um checkpoint em
`public_dictionary_import_checkpoints`. Se o processo cair ou a rede
interromper o download, executar novamente com a mesma versão e URL ignora as
linhas até o último lote confirmado; os registros continuam sendo
atualizados por identificadores estáveis, sem duplicar verbetes. Uma versão ou
URL diferente inicia um novo checkpoint.

O log e o `ImportReport` distinguem `linesThisRun`/`linesReadThisRun` (linhas
processadas nesta execução) de `totalLines`/`totalLinesRead` (posição
acumulada no dump), além de `skippedThisRun`/`skippedLinesThisRun` e
`skippedTotal`/`skippedLinesTotal`. O total final de verbetes é `entries` ou
`importedEntries`, e também atualiza `entry_count` na fonte. O checkpoint só
avança na mesma transação que grava o lote; portanto, uma falha durante a
gravação repete no máximo o lote incompleto.

## Consulta

- `GET /api/public-dictionary?query=take&limit=40`
- `GET /api/public-dictionary/{entryId}`

A tela web está em **Dicionário público**. O mobile pode solicitar um detalhe
pontual pelo segundo endpoint e armazenar apenas esse resultado para estudo
offline; o dump completo não deve ser sincronizado para o dispositivo. O cache
local é preenchido sob demanda e usa o identificador do verbete como chave.

## Créditos e licença

As definições são extraídas do Wiktionary. A versão importada deve manter os
créditos e avisos exigidos pela licença aplicável ao dump utilizado. A
atribuição e a versão ficam registradas na tabela de fontes e aparecem no
detalhe do verbete.

Esta integração não gera traduções português-inglês em massa nem copia exemplos
privados. Exemplos de estudo continuam sendo derivados separadamente.