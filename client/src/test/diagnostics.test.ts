/* --------------------------------------------------------------------------------------------
 * GORM VSCode Extension - Diagnostics Test
 * Tests for GORM tag validation diagnostics
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate } from './helper';

suite('GORM Diagnostics Tests', () => {
	const docUri = getDocUri('diagnostics.txt');

	test('Should validate valid GORM tags without diagnostics', async () => {
		await testDiagnostics(docUri, [
			// Valid GORM tags should not produce any diagnostics
		]);
	});

	test('Should detect invalid GORM tag names', async () => {
		// Test for invalid/unknown GORM tags
		await testDiagnostics(docUri, [
			{ 
				message: 'Unknown GORM tag: invalidTag', 
				range: toRange(2, 15, 2, 35), 
				severity: vscode.DiagnosticSeverity.Error, 
				source: 'GORM Tool' 
			}
		]);
	});

	test('Should detect deprecated GORM tags', async () => {
		// Test for deprecated tags like primary_key, foreign_key
		await testDiagnostics(docUri, [
			{ 
				message: 'Deprecated GORM tag: primary_key. Use primaryKey instead', 
				range: toRange(1, 15, 1, 30), 
				severity: vscode.DiagnosticSeverity.Warning, 
				source: 'GORM Tool' 
			}
		]);
	});

	test('Should validate tag syntax and values', async () => {
		// Test for malformed tag syntax or invalid values
		await testDiagnostics(docUri, [
			{ 
				message: 'Invalid tag syntax or value', 
				range: toRange(3, 10, 3, 25), 
				severity: vscode.DiagnosticSeverity.Error, 
				source: 'GORM Tool' 
			}
		]);
	});

	test('Should detect duplicate column names in same struct', async () => {
		// Test for duplicate column names within same struct
		await testDiagnostics(docUri, [
			{ 
				message: "Duplicate column name 'user_id' already used by field 'ID'. Each column name must be unique within the struct.", 
				range: toRange(5, 20, 5, 35), 
				severity: vscode.DiagnosticSeverity.Error, 
				source: 'GORM Tool' 
			}
		]);
	});

	test('Should validate comment quote closure', async () => {
		// Test for unmatched quotes in comment values
		await testDiagnostics(docUri, [
			{ 
				message: "Comment value has unmatched single quotes. Found 1 single quotes, expected even number for proper closure.", 
				range: toRange(6, 25, 6, 45), 
				severity: vscode.DiagnosticSeverity.Error, 
				source: 'GORM Tool' 
			},
			{ 
				message: "Comment value has unmatched double quotes. Found 1 double quotes, expected even number for proper closure.", 
				range: toRange(7, 25, 7, 45), 
				severity: vscode.DiagnosticSeverity.Error, 
				source: 'GORM Tool' 
			}
		]);
	});

	test('Should warn about mixed quote styles in comments', async () => {
		// Test for mixed quote styles in comment values
		await testDiagnostics(docUri, [
			{ 
				message: "Comment value contains both single and double quotes. Consider using consistent quote style or proper escaping.", 
				range: toRange(8, 25, 8, 50), 
				severity: vscode.DiagnosticSeverity.Warning, 
				source: 'GORM Tool' 
			}
		]);
	});

	test('Should handle multiple structs in single file', async () => {
		// Test validation across multiple Go structs
		await testDiagnostics(docUri, [
			{ 
				message: 'Unknown GORM tag in Profile struct', 
				range: toRange(8, 12, 8, 28), 
				severity: vscode.DiagnosticSeverity.Error, 
				source: 'GORM Tool' 
			}
		]);
	});
});

function toRange(sLine: number, sChar: number, eLine: number, eChar: number) {
	const start = new vscode.Position(sLine, sChar);
	const end = new vscode.Position(eLine, eChar);
	return new vscode.Range(start, end);
}

async function testDiagnostics(docUri: vscode.Uri, expectedDiagnostics: vscode.Diagnostic[]) {
	await activate(docUri);

	const actualDiagnostics = vscode.languages.getDiagnostics(docUri);

	assert.equal(actualDiagnostics.length, expectedDiagnostics.length);

	expectedDiagnostics.forEach((expectedDiagnostic, i) => {
		const actualDiagnostic = actualDiagnostics[i];
		assert.equal(actualDiagnostic.message, expectedDiagnostic.message);
		assert.deepEqual(actualDiagnostic.range, expectedDiagnostic.range);
		assert.equal(actualDiagnostic.severity, expectedDiagnostic.severity);
	});
}