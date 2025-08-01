/* --------------------------------------------------------------------------------------------
 * GORM VSCode Extension - Client Entry Point
 * Language Client for GORM struct tag validation in Go files
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { workspace, ExtensionContext } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
	// The server is implemented in node
	const serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	
	// Server options for both run and debug modes
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
		}
	};

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for Go documents
		documentSelector: [{ scheme: 'file', language: 'go' }],
		synchronize: {
			// Notify the server about file changes to Go files
			fileEvents: workspace.createFileSystemWatcher('**/*.go')
		}
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'gormToolServer',
		'GORM Tool Server',
		serverOptions,
		clientOptions
	);

	// Start the client. This will also launch the server
	client.start();
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
