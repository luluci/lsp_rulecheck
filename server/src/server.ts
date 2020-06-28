"use strict";

import {
	CodeAction,
	CodeActionKind,
	createConnection,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	Range,
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

/**
 * Analyzes the text document for problems.
 * @param doc text document to analyze
 */
function validate(doc: TextDocument) {
	/*
	const diagnostics: Diagnostic[] = [];
	const range: Range = {start: {line: 0, character: 0},
						  end: {line: 0, character: Number.MAX_VALUE}};
	diagnostics.push(Diagnostic.create(range, "Hello world", DiagnosticSeverity.Warning, "", "sample"));
	connection.sendDiagnostics({ uri: doc.uri, diagnostics });
	*/

	// ２つ以上並んでいるアルファベット大文字を検出
	const text = doc.getText();
	// 検出するための正規表現 (正規表現テスト: https://regex101.com/r/wXZbr9/1)
	const pattern = /\b[A-Z]{2,}\b/g;
	let m: RegExpExecArray | null;

	// 警告などの状態を管理するリスト
	const diagnostics: Diagnostic[] = [];
	// 正規表現に引っかかった文字列すべてを対象にする
	while ((m = pattern.exec(text)) !== null) {
		// 対象の位置から正規表現に引っかかった文字列までを対象にする
		const range: Range = {start: doc.positionAt(m.index),
							  end: doc.positionAt(m.index + m[0].length),
		};
		// 警告内容を作成，上から範囲，メッセージ，重要度，ID，警告原因
		const diagnostic: Diagnostic = Diagnostic.create(
			range,
			`${m[0]} is all uppercase.`,
			DiagnosticSeverity.Warning,
			"",
			"sample",
		);
		// 警告リストに警告内容を追加
		diagnostics.push(diagnostic);
	}

	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: doc.uri, diagnostics });
}

function setupDocumentsListeners() {
	documents.listen(connection);

	let debug_onDonDidOpen = 0;
	// ドキュメントを開いたとき？
	documents.onDidOpen((event) => {
		validate(event.document);

		//connection.console.log('onDidOpen');
		console.log(`server: onDidOpen(${debug_onDonDidOpen})`);
		debug_onDonDidOpen++;
	});

	let debug_onDidChangeContent = 0;
	// ドキュメントが変更されたとき
	documents.onDidChangeContent((change) => {
		validate(change.document);

		//connection.console.log('onDidChangeContent');
		console.log(`server: onDidChangeContent(${debug_onDidChangeContent})`);
		debug_onDidChangeContent++;
	});

	documents.onDidClose((close) => {
		connection.sendDiagnostics({ uri: close.document.uri, diagnostics: []});
	});

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



	connection.onDidChangeWatchedFiles(_change => {
		// Monitored files have change in VSCode
		connection.console.log('We received an file change event');
	});
	
}

console.log("server: start!!");

// Listen on the connection
connection.listen();
