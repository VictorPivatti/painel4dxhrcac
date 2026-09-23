# Painel MCI · OPSS 2026 — SEQUALI / HRCAC

Painel de acompanhamento do Projeto de Disseminação das Políticas Institucionais
(Cáceres/MT). Site estático, sem banco de dados e sem custo, publicado via GitHub Pages.

O painel é uma ferramenta de condução do projeto: mostra à equipe onde cada política está
e o que vem pela frente. A evidência dos treinamentos fica no Humand (plataforma da AGIR).

## Como atualizar o painel

Todo o conteúdo vem de um único arquivo: **`data.json`**.
Editar esse arquivo e salvar (commit) já atualiza o painel para todo mundo que abrir o link.

### O que editar a cada semana

Dentro de `data.json`, procure a lista `"acoes"`. Cada linha é uma linha do Placar Semanal:

```json
{ "semana": 9, "politica": "Planejamento Estratégico", "inicio": "21/09/2026", "status": "andamento", "reuniao": "Agendada" }
```

| Campo | O que é | Valores aceitos |
|---|---|---|
| `semana` | Número da semana prevista | 1 a 17 |
| `politica` | Nome exato da política | tem que bater com a lista `politicas` |
| `inicio` | Data em que o treinamento foi liberado no Humand | **`dd/mm/aaaa`** ou `""` |
| `status` | Situação atual | `concluido`, `andamento`, `atraso`, `reagendado`, `nao` |
| `reuniao` | Reunião realizada? | `Sim`, `Não`, `Agendada`, `Reagendada` |

Quando o treinamento é liberado no Humand, a política passa a `concluido` e recebe a data
daquele dia. Enquanto o treinamento está pronto mas ainda aguardando a data de liberação,
o status é `andamento` e a data pode já estar preenchida com a data programada.

Se alguma data for digitada fora do formato `dd/mm/aaaa`, o painel exibe um **alerta vermelho
no topo** nomeando a política e o valor errado. A data errada não derruba mais o MCI — só a
coluna de atraso daquela linha fica sem cálculo.

## Como os números são calculados

**MCI (indicador principal)**
`(nº de políticas concluídas ÷ total de políticas) × 100`, arredondado em 2 casas.
Hoje: `9 ÷ 19` = **47,37%**

Cada política vale 1/19 do índice, ou 5,26 pontos percentuais.
Só entram políticas com status `concluido`; uma política em andamento não pontua.
A meta de 80% equivale a 15,2 políticas, ou seja, é atingida na 16ª.

**Evolução da Conformidade (Ago/Set/Out/Nov)**
MCI **acumulado** ao fim de cada mês, considerando as políticas concluídas até ali.
É diretamente comparável à linha "Esperado" logo abaixo de cada círculo.
Meses que ainda não começaram mostram `—`, não zero.

A linha **"Esperado"** de cada mês não é um número fixo digitado no `data.json` — é
calculada automaticamente a partir do `cronograma`: é a % de políticas cujo prazo (fim
da semana prevista) já venceu até o fim daquele mês. Ela sobe do jeito que o cronograma
semana a semana realmente exige, não numa reta artificial. Isso significa que a meta
mensal muda sozinha se o `cronograma` for editado (política movida de semana, por
exemplo) — não precisa (e não deve) editar um valor de "esperado" à parte.

O mesmo valor calculado para o mês corrente também decide o selo "MCI: Dentro do
esperado / Atenção / Meta atingida" no topo do painel.

**Previstas** — total de políticas institucionais (19).
**Realizadas** — políticas concluídas (mesmo número das disseminadas).
**Execução** — políticas com status `andamento`.
**Pendências** — políticas cuja semana prevista já terminou e que não estão em `concluido`, `andamento` ou `reagendado`.
**No prazo** — políticas liberadas dentro da semana prevista ÷ políticas já liberadas.
**Semana atual** — semana do cronograma que contém a data de hoje.
**Reunião** — `1` (reunião de abertura, fixo) + nº de **políticas** (não de linhas) com
alguma linha marcada `reuniao: "Sim"`. Se uma política for reagendada e aparecer em mais
de uma linha, ela só conta 1 reunião, mesmo que mais de uma linha diga "Sim".

**Atraso (coluna do placar)**
Contado a partir do **fim** da semana prevista, porque o prazo de cada política é a semana
inteira, não o dia de segunda. Liberou entre segunda e sexta daquela semana = "No prazo".
Data futura = "Programado".

Quando uma política aparece em mais de uma linha, vale a linha de status mais avançado
(`concluido` > `andamento` > `reagendado` > `atraso` > `nao`).

O status `atraso` também pode aparecer **sem** ninguém ter digitado isso no `data.json`:
se o prazo da semana prevista já venceu e a linha continua `andamento` ou `nao`, o
placar mostra "Em atraso" automaticamente na exibição, mesmo que o campo `status`
salvo ainda diga outra coisa. O valor gravado no arquivo não muda — só a cor exibida.
Isso evita que uma política vencida fique com a pill neutra ("Não concluído") só
porque ninguém atualizou o campo manualmente naquela semana.

## Correções aplicadas na migração

Quatro datas estavam com dígitos faltando na base anterior e, no cálculo antigo, eram
descartadas em silêncio, derrubando o MCI:

| Política | Antes | Depois |
|---|---|---|
| Política da Qualidade | `18/08/202` | `18/08/2026` |
| Suprimentos | `14/09/202` | `14/09/2026` |
| Controle Interno | `15/09/202` | `15/09/2026` |
| Gestão do Cuidado | `28/09/20` | `28/09/2026` |

O registro original está preservado no campo `_correcoesAplicadas` do `data.json`.

## Ao alterar app.js ou style.css

O `index.html` referencia esses dois arquivos com um número de versão
(`app.js?v=4`). Sempre que um deles mudar, **incremente esse número** nas duas
linhas do `index.html`. Sem isso, quem já abriu o painel continua vendo a versão
antiga que ficou no cache do navegador, mesmo com o arquivo novo publicado.

O `data.json` não precisa disso: ele já é lido com `cache: "no-store"`, então a
atualização semanal dos dados aparece para todo mundo na hora.

## Estrutura dos arquivos

```
index.html   estrutura da página
style.css    estilos (paleta idêntica à do painel original)
app.js       cálculos e renderização
data.json    ← o único arquivo que precisa ser editado
assets/      imagem do cabeçalho
```

---
SEQUALI – HRCAC · Cáceres / MT
