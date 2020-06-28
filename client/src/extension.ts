"use strict";

import * as path from "path";
import { ExtensionContext, window as Window } from "vscode";
import { workspace, commands, OutputChannel } from 'vscode';
import { LanguageClient, LanguageClientOptions, RevealOutputChannelOn, ServerOptions, TransportKind } from "vscode-languageclient";
import * as WebSocket from 'ws';

let client: LanguageClient;

export function activate(context: ExtensionContext): void {

	const serverModule = context.asAbsolutePath(path.join("server", "out", "server.js"));
	const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"], cwd: process.cwd() };
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc, options: { cwd: process.cwd() } },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions,
		},
	};

	// デバッグ用
	const socketPort = workspace.getConfiguration('languageServerExample').get('port', 7000);
	let socket: WebSocket | null = null;
	
	commands.registerCommand('languageServerExample.startStreaming', () => {
		// Establish websocket connection
		socket = new WebSocket(`ws://localhost:${socketPort}`);
	});
	// The log to send
	let log = '';
	const websocketOutputChannel: OutputChannel = {
		name: 'websocket',
		// Only append the logs but send them later
		append(value: string) {
			log += value;
			console.log(value);
		},
		appendLine(value: string) {
			log += value;
			// Don't send logs until WebSocket initialization
			if (socket && socket.readyState === WebSocket.OPEN) {
				socket.send(log);
			}
			log = '';
		},
		clear() {},
		show() {},
		hide() {},
		dispose() {}
	};
	// デバッグ用

	const clientOptions: LanguageClientOptions = {
		documentSelector: [
			{
				scheme: "file",
				language: "c",
			},
			{
				scheme: "file",
				language: "plaintext",
			},
			{
				scheme: "file",
				language: "markdown",
			}],
		diagnosticCollectionName: "sample",
		revealOutputChannelOn: RevealOutputChannelOn.Never,

		// Hijacks all LSP logs and redirect them to a specific port through WebSocket connection
		outputChannel: websocketOutputChannel
	};


	try {
		client = new LanguageClient(
			'languageServerExample',
			"Sample LSP Server",
			serverOptions,
			clientOptions
		);
	} catch (err) {
		Window.showErrorMessage("The extension couldn't be started. See the output channel for details.");

		return;
	}
	client.registerProposedFeatures();

	context.subscriptions.push(
		client.start(),
	);

	console.log("client: start!!");
}


export function deactivate(): Thenable<void> | undefined {
	console.log("deactive!!");

	if (!client) {
		return undefined;
	}
	return client.stop();
}

