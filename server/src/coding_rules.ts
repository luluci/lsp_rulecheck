"use strict";


import {
	Diagnostic,
	DiagnosticSeverity,
	Range,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";


/**
 * Analyzes the text document for problems.
 * @param doc text document to analyze
 */
export function validate(doc: TextDocument, diagnostics: Diagnostic[]) {
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

}

