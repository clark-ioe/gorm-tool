/* --------------------------------------------------------------------------------------------
 * GORM Tool Server for VSCode
 * Provides validation and diagnostics for GORM struct tags in Go files
 * ------------------------------------------------------------------------------------------ */

import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	DocumentDiagnosticReportKind,
	type DocumentDiagnosticReport,
	DidChangeWatchedFilesParams,
	FileEvent
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

import { parseGoStructs, validateGormTags, findFieldRange } from './parser';

// Constants
const DIAGNOSTIC_SOURCE = 'GORM Tool';

// Create a connection for the server, using Node's IPC as a transport.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// Check client capabilities
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			completionProvider: {
				resolveProvider: true
			},
			diagnosticProvider: {
				interFileDependencies: false,
				workspaceDiagnostics: false
			}
		}
	};
	
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// Settings interface
interface GormLanguageServerSettings {
	maxNumberOfProblems: number;
}

const defaultSettings: GormLanguageServerSettings = { maxNumberOfProblems: 1000 };
let globalSettings: GormLanguageServerSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings = new Map<string, Thenable<GormLanguageServerSettings>>();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		documentSettings.clear();
	} else {
		globalSettings = (change.settings.gormLanguageServer || defaultSettings);
	}
	connection.languages.diagnostics.refresh();
});

function getDocumentSettings(resource: string): Thenable<GormLanguageServerSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'gormLanguageServer'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

connection.languages.diagnostics.on(async (params) => {
	const document = documents.get(params.textDocument.uri);
	if (document !== undefined) {
		return {
			kind: DocumentDiagnosticReportKind.Full,
			items: await validateGoFile(document.uri, document.getText())
		} satisfies DocumentDiagnosticReport;
	} else {
		return {
			kind: DocumentDiagnosticReportKind.Full,
			items: []
		} satisfies DocumentDiagnosticReport;
	}
});

// Document change handlers
documents.onDidChangeContent(async change => {
	// Only process Go files, but don't send diagnostics here to avoid duplication
	// Diagnostics will be handled by the diagnostic provider
	if (change.document.uri.endsWith('.go')) {
		// Document content changed - diagnostics will be handled by the diagnostic provider
	}
});

documents.onDidOpen(async event => {
	// Only process Go files, but don't send diagnostics here to avoid duplication
	// Diagnostics will be handled by the diagnostic provider
	if (event.document.uri.endsWith('.go')) {
		// Document opened - diagnostics will be handled by the diagnostic provider
	}
});

connection.onDidChangeWatchedFiles((params: DidChangeWatchedFilesParams) => {
	for (const change of params.changes) {
		processFileChange(change);
	}
});

async function processFileChange(change: FileEvent) {
	try {
		const uri = change.uri;
		
		if (!uri.endsWith('.go')) {
			return;
		}
		
		// Log file change but don't send diagnostics to avoid duplication
		// Diagnostics will be handled by the diagnostic provider
		
		// Trigger diagnostic refresh instead of sending diagnostics directly
		connection.languages.diagnostics.refresh();
		
	} catch (error) {
		console.error('Error processing file change:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		
		if (change.uri) {
			connection.sendDiagnostics({ 
				uri: change.uri, 
				diagnostics: [{
					range: {
						start: { line: 0, character: 0 },
						end: { line: 0, character: 0 }
					},
					message: `Internal error: ${errorMessage}`,
					severity: DiagnosticSeverity.Error,
					source: DIAGNOSTIC_SOURCE,
					code: 'internal-error'
				}]
			});
		}
	}
}

async function validateGoFile(uri: string, text: string): Promise<Diagnostic[]> {
	if (!text || text.trim().length === 0) {
		return [];
	}
	
	const settings = await getDocumentSettings(uri);
	const diagnostics: Diagnostic[] = [];
	
	try {
		const structs = parseGoStructs(text);
		
		if (structs.length === 0) {
			return [];
		}
		
		const gormDiagnostics = validateGormTags(structs);
		
		if (gormDiagnostics.length === 0) {
			return [];
		}
		
		const maxProblems = settings.maxNumberOfProblems || 1000;
		const limitedDiagnostics = gormDiagnostics.slice(0, maxProblems);
		
		for (const diag of limitedDiagnostics) {
			try {
				const range = findFieldRange(text, diag.structName, diag.fieldName, diag.errorTag);
				
				const validRange = {
					start: { 
						line: Math.max(0, range.start.line), 
						character: Math.max(0, range.start.character) 
					},
					end: { 
						line: Math.max(0, range.end.line), 
						character: Math.max(0, range.end.character) 
					}
				};
				
				// Ensure end is not before start
				if (validRange.end.line < validRange.start.line || 
					(validRange.end.line === validRange.start.line && validRange.end.character < validRange.start.character)) {
					validRange.end = { ...validRange.start };
					validRange.end.character += 1;
				}
				
				const diagnostic: Diagnostic = {
					range: validRange,
					message: diag.message,
					severity: diag.level === 'error' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
					source: DIAGNOSTIC_SOURCE,
					code: `gorm-${diag.level}`
				};
				
				if (hasDiagnosticRelatedInformationCapability) {
					diagnostic.relatedInformation = [
						{
							location: {
								uri,
								range: Object.assign({}, validRange)
							},
							message: `In struct: ${diag.structName}, field: ${diag.fieldName}`
						}
					];
				}
				
				diagnostics.push(diagnostic);
			} catch (rangeError) {
				console.error('Error finding field range:', rangeError);
				const fallbackDiagnostic: Diagnostic = {
					range: {
						start: { line: 0, character: 0 },
						end: { line: 0, character: 10 }
					},
					message: `${diag.message} (in struct: ${diag.structName}, field: ${diag.fieldName})`,
					severity: diag.level === 'error' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
					source: DIAGNOSTIC_SOURCE,
					code: `gorm-${diag.level}`
				};
				
				diagnostics.push(fallbackDiagnostic);
			}
		}
		
	} catch (parseError) {
		console.error('Error parsing Go structs:', parseError);
		const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
		diagnostics.push({
			range: {
				start: { line: 0, character: 0 },
				end: { line: 0, character: 0 }
			},
			message: `Failed to parse Go structs: ${errorMessage}`,
			severity: DiagnosticSeverity.Error,
			source: DIAGNOSTIC_SOURCE,
			code: 'parse-error'
		});
	}
	
	return diagnostics;
}

// Completion handlers (for future GORM tag completion feature)
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		return [
			{
				label: 'gorm:"column:name"',
				kind: CompletionItemKind.Snippet,
				data: 1
			},
			{
				label: 'gorm:"primaryKey"',
				kind: CompletionItemKind.Snippet,
				data: 2
			}
		];
	}
);

connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1) {
			item.detail = 'GORM column tag';
			item.documentation = 'Specify database column name';
		} else if (item.data === 2) {
			item.detail = 'GORM primary key tag';
			item.documentation = 'Mark field as primary key';
		}
		return item;
	}
);

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();
