import { ProcessoPIR, SITUACOES, SituacaoType } from "../types";

export function gerarHtmlEmail(processo: ProcessoPIR): string {
  const listFuncionariosHtml = processo.funcionarios
    .map(
      (f) => `
      <tr>
        <td style="padding: 6px; font-weight: bold; color: white; font-family: sans-serif; font-size: 13px;">${f.nome}</td>
        <td style="padding: 6px; font-weight: bold; color: white; font-family: monospace; font-size: 13px;">${f.matricula}</td>
      </tr>
      `
    )
    .join('');

  const listBagagensHtml = processo.bagagens
    .map((b) => {
      const situacaoLabel = SITUACOES[b.situacao as SituacaoType]?.label || b.situacao;
      return `
      <tr>
        <td style="padding: 6px 4px; font-weight: bold; color: white; font-family: sans-serif; font-size: 13px;">${situacaoLabel}</td>
        <td style="padding: 6px 4px; font-weight: bold; color: white; font-family: monospace; font-size: 13px;">${b.etiqueta || '-'}</td>
        <td style="padding: 6px 4px; font-weight: bold; color: white; font-family: monospace; font-size: 13px;">${b.pnr || '-'}</td>
        <td style="padding: 6px 4px; font-weight: bold; color: white; font-family: sans-serif; font-size: 13px;">${b.vooOrigem || '-'}</td>
        <td style="padding: 6px 4px; font-weight: bold; color: white; font-family: sans-serif; font-size: 13px;">${b.dataVoo || '-'}</td>
        <td style="padding: 6px 4px; font-weight: bold; color: white; font-family: sans-serif; font-size: 13px;">${b.corTipo || '-'}</td>
        <td style="padding: 6px 4px; font-weight: bold; color: white; font-family: sans-serif; font-size: 13px;">${b.observacoes || '-'}</td>
      </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Lista de sobras</title>
  <style>
    body {
      background-color: #003e82;
      color: white;
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 40px;
    }
    .container {
      max-width: 1000px;
      margin: 0;
    }
    h1 {
      font-size: 38px;
      font-weight: bold;
      margin: 0 0 10px 0;
      line-height: 1.15;
      font-family: Arial, sans-serif;
    }
    h2 {
      font-size: 16px;
      font-weight: bold;
      margin: 20px 0 0 0;
      color: white;
      font-family: Arial, sans-serif;
      line-height: 1.4;
    }
    fieldset {
      border: 1px solid white;
      border-radius: 0px;
      padding: 15px;
      margin: 25px 0;
    }
    legend {
      font-size: 15px;
      font-weight: bold;
      padding: 0 6px;
      font-family: Arial, sans-serif;
    }
    .form-group {
      margin-bottom: 12px;
    }
    label {
      font-size: 13px;
      font-weight: bold;
      display: inline-block;
      margin-right: 10px;
      font-family: Arial, sans-serif;
    }
    input[type="text"] {
      background-color: white;
      color: black;
      border: none;
      padding: 4px 8px;
      font-size: 13px;
      font-weight: bold;
      width: 200px;
      border-radius: 0px;
      outline: none;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      margin-bottom: 15px;
    }
    th {
      text-align: left;
      font-size: 13px;
      font-weight: bold;
      padding: 6px 4px;
      color: white;
      font-family: Arial, sans-serif;
    }
    td {
      padding: 6px 4px;
      font-size: 13px;
    }
    .btn {
      background-color: white;
      color: black;
      border: none;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: bold;
      border-radius: 3px;
      cursor: pointer;
      font-family: Arial, sans-serif;
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .btn-large {
      padding: 6px 12px;
      font-size: 13px;
      margin-bottom: 12px;
      display: block;
      width: fit-content;
    }
  </style>
</head>
<body>
  <div class="container">
    <table style="width: 100%; border: none; margin: 0 0 35px 0;">
      <tr>
        <td style="width: 58%; vertical-align: top; padding: 0;">
          <h1 style="color: white; margin: 0; padding: 0;">Receita Federal do<br>Brasil</h1>
          <h2 style="color: white; opacity: 0.95;">Formulário de Bagagens<br>Extraviadas - Versão 1.0</h2>
        </td>
        <td style="width: 42%; vertical-align: top; padding: 0 0 0 20px; text-align: left; font-size: 13px; color: white; line-height: 1.6; font-family: Arial, sans-serif;">
          <strong style="display: block; margin-bottom: 10px; font-size: 14px;">Instruções:</strong>
          <ol style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;">Preencher o formulário e clicar em "Gerar arquivo para envio"</li>
            <li style="margin-bottom: 8px;">Enviar e-mail com o arquivo anexo para <a href="mailto:alfgru.bagagem@rfb.gov.br" style="color: #ffde00; font-weight: bold; text-decoration: underline;">alfgru.bagagem@rfb.gov.br</a></li>
            <li style="margin-bottom: 8px;">O assunto do e-mail deve ser "LISTA DE SOBRAS"</li>
          </ol>
          <p style="margin: 20px 0 0 0; font-size: 13px;">Observação: O arquivo gerado encontra-se na pasta "Downloads".</p>
        </td>
      </tr>
    </table>

    <!-- FIELDSET 1: Informações -->
    <fieldset>
      <legend>Informações</legend>
      <div class="form-group" style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
        <label>Companhia Aérea</label>
        <input type="text" value="${processo.companhiaAerea}" readonly />
      </div>
      <p style="font-size: 13px; font-weight: bold; margin: 20px 0 10px 0;">Informar abaixo os funcionários que acompanharão as bagagens até a Alfândega:</p>
      <table>
        <thead>
          <tr>
            <th style="width: 50%;">Nome</th>
            <th style="width: 50%;">Matrícula GRU</th>
          </tr>
        </thead>
        <tbody>
          ${listFuncionariosHtml || '<tr><td colspan="2" style="color: rgba(255,255,255,0.7); font-style: italic;">Nenhum funcionário adicionado.</td></tr>'}
        </tbody>
      </table>
      <button type="button" class="btn" onclick="alert('Formulário congelado. Para alterações, faça no sistema principal.')">Adicionar Funcionário</button>
    </fieldset>

    <!-- FIELDSET 2: Bagagens -->
    <fieldset>
      <legend>Bagagens</legend>
      <table>
        <thead>
          <tr>
            <th>Situação</th>
            <th>Etiqueta</th>
            <th>Reserva</th>
            <th>Voo de Origem</th>
            <th>Data do Voo</th>
            <th>Cor e Tipo</th>
            <th>Observação</th>
          </tr>
        </thead>
        <tbody>
          ${listBagagensHtml || '<tr><td colspan="7" style="color: rgba(255,255,255,0.7); font-style: italic; text-align: center;">Nenhuma bagagem incluída.</td></tr>'}
        </tbody>
      </table>
      <button type="button" class="btn" onclick="alert('Formulário congelado. Para alterações, faça no sistema principal.')">Adicionar Bagagem</button>
    </fieldset>

    <!-- Bottom Buttons (Stacked/Vertical as in the image copy) -->
    <div style="margin-top: 30px;">
      <button type="button" class="btn btn-large" onclick="window.print()">Gerar arquivo para envio</button>
      <button type="button" class="btn btn-large" style="margin-top: 15px;" onclick="alert('Formulário limpo.')">Limpar</button>
    </div>
  </div>
</body>
</html>`;
}
