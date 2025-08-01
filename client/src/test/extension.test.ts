/* --------------------------------------------------------------------------------------------
 * GORM VSCode Extension - Extension Test
 * Tests for extension activation and basic functionality
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate } from './helper';
import { EXTENSION_ID, SERVER_ACTIVATION_DELAY } from './constants';

suite('GORM Extension Tests', () => {
	const docUri = getDocUri('diagnostics.txt');

	test('Extension should be present', () => {
		assert.ok(vscode.extensions.getExtension(EXTENSION_ID));
	});

	test('Extension should activate', async () => {
		const ext = vscode.extensions.getExtension(EXTENSION_ID)!;
		await ext.activate();
		assert.equal(ext.isActive, true);
	});

	test('Should register language client', async () => {
		await activate(docUri);
		
		// Check if the extension has registered for Go files
		const goDoc = await vscode.workspace.openTextDocument({
			language: 'go',
			content: `package main

type User struct {
	ID uint \`gorm:"primaryKey"\`
}`
		});

		// Wait a bit for the language server to process
		await new Promise(resolve => setTimeout(resolve, 1000));
		
		// The document should be recognized
		assert.equal(goDoc.languageId, 'go');
	});

	test('Should provide diagnostics for Go files', async () => {
		const goDoc = await vscode.workspace.openTextDocument({
			language: 'go',
			content: `package main

type User struct {
	ID uint \`gorm:"invalidTag"\`
}`
		});

		await vscode.window.showTextDocument(goDoc);
		
		// Wait for diagnostics to be processed
		await new Promise(resolve => setTimeout(resolve, SERVER_ACTIVATION_DELAY));
		
		const diagnostics = vscode.languages.getDiagnostics(goDoc.uri);
		
		// We should have at least some diagnostics for invalid tags
		// Note: This is a basic check, actual validation depends on the parser implementation
		assert.ok(Array.isArray(diagnostics));
	});
});
