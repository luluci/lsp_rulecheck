"use strict";

import coding_rules = require('./coding_rules');

import {
	CodeAction,
	CodeActionKind,
	createConnection,
	Diagnostic,
	ProposedFeatures,
	TextDocuments,
	TextDocumentEdit,
	TextDocumentSyncKind,
	TextEdit,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";

namespace CommandIDs {
	export const fix = "sample.fix";
}
// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
//const connection = createConnection();
const connection = createConnection(ProposedFeatures.all);
connection.console.info(`Sample server running in node ${process.version}`);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents!: TextDocuments<TextDocument>;

connection.onInitialize(() => {
	documents = new TextDocuments(TextDocument);
	setupDocumentsListeners();
	setupConnectionAction();

	return {
		capabilities: {
			textDocumentSync: {
				openClose: true,
				change: TextDocumentSyncKind.Incremental,
				willSaveWaitUntil: false,
				save: {
					includeText: false,
				},
			},
			codeActionProvider: {
				codeActionKinds: [CodeActionKind.QuickFix],
			},
			executeCommandProvider: {
				commands: [CommandIDs.fix],
			},
		},
	};
});

function set_warning(doc: TextDocument) {
	const diagnostics: Diagnostic[] = [];
	coding_rules.validate(doc, diagnostics);
	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: doc.uri, diagnostics });
}

function setupDocumentsListeners() {
	documents.listen(connection);

	let debug_onDonDidOpen = 0;
	// ドキュメントを開いたとき？
	documents.onDidOpen((event) => {
		set_warning(event.document);

		//connection.console.log('onDidOpen');
		console.log(`server: onDidOpen(${debug_onDonDidOpen})`);
		debug_onDonDidOpen++;
	});

	let debug_onDidChangeContent = 0;
	// ドキュメントが変更されたとき
	documents.onDidChangeContent((change) => {
		set_warning(change.document);

		//connection.console.log('onDidChangeContent');
		console.log(`server: onDidChangeContent(${debug_onDidChangeContent})`);
		debug_onDidChangeContent++;
	});

	let debug_onDidClose = 0;
	documents.onDidClose((close) => {
		connection.sendDiagnostics({ uri: close.document.uri, diagnostics: []});

		//connection.console.log('onDidClose');
		console.log(`server: onDidClose(${debug_onDidClose})`);
		debug_onDidChangeContent++;
	});

	// ファイルを保存しようと(?)したとき
	documents.onWillSave((event) => {
		event.document;

		console.log(`server: onWillSave()`);
	});
	// ファイルを保存したとき
	documents.onDidSave((event) => {
		event.document;

		console.log(`server: onDidSave()`);
	});
}

function setupConnectionAction() {

	// Code Actionを追加する
	connection.onCodeAction((params) => {
		// sampleから生成した警告のみを対象とする
		const diagnostics = params.context.diagnostics.filter((diag) => diag.source === "sample");
		// 対象ファイルを取得する
		const textDocument = documents.get(params.textDocument.uri);
		if (textDocument === undefined || diagnostics.length === 0) {
			return [];
		}
		const codeActions: CodeAction[] = [];
		// 各警告に対してアクションを生成する
		diagnostics.forEach((diag) => {
			// アクションの目的
			const title = "Fix to lower case";
			// 警告範囲の文字列取得
			const originalText = textDocument.getText(diag.range);
			// 該当箇所を小文字に変更
			const edits = [TextEdit.replace(diag.range, originalText.toLowerCase())];
			const editPattern = { documentChanges: [
				TextDocumentEdit.create({uri: textDocument.uri,
										 version: textDocument.version},
										edits)] };
			// コードアクションを生成
			const fixAction = CodeAction.create(title,
												editPattern,
												CodeActionKind.QuickFix);
			// コードアクションと警告を関連付ける
			fixAction.diagnostics = [diag];
			codeActions.push(fixAction);
		});

		return codeActions;
	});

	let debug_onDidChangeWatchedFiles = 0;
	connection.onDidChangeWatchedFiles(_change => {
		// Monitored files have change in VSCode
		connection.console.log('We received an file change event');
		console.log(`server: onDidChangeWatchedFiles(${debug_onDidChangeWatchedFiles})`);
	});

}

console.log("server: start!!");

// Listen on the connection
connection.listen();
