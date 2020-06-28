"use strict";

import * as path from "path";
import { ExtensionContext, window as Window } from "vscode";
//import { workspace, commands, OutputChannel } from 'vscode';
import { LanguageClient, LanguageClientOptions, RevealOutputChannelOn, ServerOptions, TransportKind } from "vscode-languageclient";

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
    const clientOptions: LanguageClientOptions = {
        documentSelector: [
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
		outputChannelName: 'sample_output_channel',
    };

    try {
        client = new LanguageClient("Sample LSP Server", serverOptions, clientOptions);
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

