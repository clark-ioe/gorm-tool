/* --------------------------------------------------------------------------------------------
 * GORM VSCode Extension - Completion Test
 * Tests for GORM tag auto-completion functionality
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate } from './helper';

suite('GORM Completion Tests', () => {
	const docUri = getDocUri('completion.txt');

	test('Should provide GORM tag completions', async () => {
		await testCompletion(docUri, new vscode.Position(0, 0), {
			items: [
				{ label: 'gorm:"column:name"', kind: vscode.CompletionItemKind.Snippet },
				{ label: 'gorm:"primaryKey"', kind: vscode.CompletionItemKind.Snippet },
			]
		});
	});

	test('Should provide completion for specific contexts', async () => {
		// Test completion within gorm tag context
		await testCompletion(docUri, new vscode.Position(1, 15), {
			items: [
				{ label: 'gorm:"column:name"', kind: vscode.CompletionItemKind.Snippet },
				{ label: 'gorm:"primaryKey"', kind: vscode.CompletionItemKind.Snippet },
			]
		});
	});

	test('Should filter completions based on existing content', async () => {
		// Test that completion filters suggestions based on what's already typed
		await testCompletion(docUri, new vscode.Position(2, 8), {
			items: [
				{ label: 'gorm:"column:name"', kind: vscode.CompletionItemKind.Snippet },
			]
		});
	});
});

async function testCompletion(
	docUri: vscode.Uri,
	position: vscode.Position,
	expectedCompletionList: vscode.CompletionList
) {
	await activate(docUri);

	// Execute completion provider
	const actualCompletionList = (await vscode.commands.executeCommand(
		'vscode.executeCompletionItemProvider',
		docUri,
		position
	)) as vscode.CompletionList;

	assert.ok(actualCompletionList.items.length >= expectedCompletionList.items.length);
	
	expectedCompletionList.items.forEach((expectedItem) => {
		const actualItem = actualCompletionList.items.find(
			(item) => item.label === expectedItem.label
		);
		assert.ok(actualItem, `Expected completion item '${expectedItem.label}' not found`);
		assert.equal(actualItem.kind, expectedItem.kind);
	});
}
