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

**Previstas** — total de políticas institucionais (19).
**Realizadas** — políticas concluídas (mesmo número das disseminadas).
**Execução** — políticas com status `andamento`.
**Pendências** — políticas cuja semana prevista já terminou e que não estão em `concluido`, `andamento` ou `reagendado`.
**No prazo** — políticas liberadas dentro da semana prevista ÷ políticas já liberadas.
**Semana atual** — semana do cronograma que contém a data de hoje.
**Reunião** — `1` (reunião de abertura, fixo) + nº de linhas com `reuniao: "Sim"`.

**Atraso (coluna do placar)**
Contado a partir do **fim** da semana prevista, porque o prazo de cada política é a semana
inteira, não o dia de segunda. Liberou entre segunda e sexta daquela semana = "No prazo".
Data futura = "Programado".

Quando uma política aparece em mais de uma linha, vale a linha de status mais avançado
(`concluido` > `andamento` > `reagendado` > `atraso` > `nao`).

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
