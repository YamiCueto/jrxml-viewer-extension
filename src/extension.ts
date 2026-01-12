import * as vscode from 'vscode';
import { JrxmlEditorProvider } from './jrxmlEditorProvider';
import { JrxmlFilesProvider } from './jrxmlFilesProvider';
import { JrxmlPropertiesProvider } from './jrxmlPropertiesProvider';
import { JrxmlElementsProvider } from './jrxmlElementsProvider';

// Create output channel for logging
export const outputChannel = vscode.window.createOutputChannel('JRXML Viewer');

export function activate(context: vscode.ExtensionContext) {
    outputChannel.appendLine('===========================================');
    outputChannel.appendLine('JRXML Viewer Extension Activating...');
    outputChannel.appendLine(`Time: ${new Date().toLocaleString()}`);
    outputChannel.appendLine('===========================================');
    console.log('JRXML Viewer extension is now active');

    // Get configuration for default view
    const config = vscode.workspace.getConfiguration('jrxml-viewer');
    const defaultView = config.get<string>('defaultView', 'preview');
    outputChannel.appendLine(`Default view setting: ${defaultView}`);

    // Register sidebar tree views first
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    
    // JRXML Files Explorer
    const filesProvider = new JrxmlFilesProvider(workspaceRoot);
    const filesTreeView = vscode.window.createTreeView('jrxmlFiles', {
        treeDataProvider: filesProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(filesTreeView);

    // JRXML Properties Panel
    const propertiesProvider = new JrxmlPropertiesProvider();
    const propertiesTreeView = vscode.window.createTreeView('jrxmlProperties', {
        treeDataProvider: propertiesProvider
    });
    context.subscriptions.push(propertiesTreeView);

    // JRXML Elements Navigator
    outputChannel.appendLine('Creating Elements Navigator tree view...');
    const elementsProvider = new JrxmlElementsProvider();
    const elementsTreeView = vscode.window.createTreeView('jrxmlElements', {
        treeDataProvider: elementsProvider
    });
    context.subscriptions.push(elementsTreeView);

    // Register the custom editor provider (after creating providers so it can reference them)
    outputChannel.appendLine('Registering custom editor provider...');
    const provider = new JrxmlEditorProvider(context, elementsProvider, propertiesProvider);
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            'jrxml-viewer.editor',
            provider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true,
                },
                supportsMultipleEditorsPerDocument: false,
            }
        )
    );

    outputChannel.appendLine('All tree views created successfully');

    // Register commands
    outputChannel.appendLine('Registering commands...');
    context.subscriptions.push(
        vscode.commands.registerCommand('jrxml-viewer.openPreview', () => {
            outputChannel.appendLine('Command: jrxml-viewer.openPreview');
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.fileName.endsWith('.jrxml')) {
                vscode.commands.executeCommand('vscode.openWith', editor.document.uri, 'jrxml-viewer.editor');
            } else {
                vscode.window.showInformationMessage('Please open a JRXML file first');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('jrxmlFiles.refresh', () => {
            outputChannel.appendLine('Command: jrxmlFiles.refresh');
            filesProvider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('jrxmlFiles.openFile', (uri: vscode.Uri) => {
            outputChannel.appendLine(`Command: jrxmlFiles.openFile - ${uri.fsPath}`);
            vscode.commands.executeCommand('vscode.openWith', uri, 'jrxml-viewer.editor');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('jrxmlElements.revealElement', (element: any) => {
            outputChannel.appendLine(`Command: jrxmlElements.revealElement - ${element.label}`);

            // Future implementation: scroll to element in editor
            vscode.window.showInformationMessage(`Element: ${element.label}`);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('jrxml-viewer.openSource', (uri?: vscode.Uri) => {
            outputChannel.appendLine(`Command: jrxml-viewer.openSource`);
            
            // Get URI from active editor if not provided
            if (!uri) {
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && activeEditor.document.fileName.endsWith('.jrxml')) {
                    uri = activeEditor.document.uri;
                } else {
                    // Try to get from custom editor
                    const visibleEditors = vscode.window.visibleTextEditors;
                    for (const editor of visibleEditors) {
                        if (editor.document.fileName.endsWith('.jrxml')) {
                            uri = editor.document.uri;
                            break;
                        }
                    }
                }
            }

            if (uri) {
                outputChannel.appendLine(`Opening source for: ${uri.fsPath}`);
                vscode.commands.executeCommand('vscode.openWith', uri, 'default');
            } else {
                vscode.window.showWarningMessage('No JRXML file to open');
            }
        })
    );

    outputChannel.appendLine('All commands registered successfully');

    // Handle opening JRXML files based on user preference
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument((document) => {
            if (document.fileName.endsWith('.jrxml')) {
                const config = vscode.workspace.getConfiguration('jrxml-viewer');
                const defaultView = config.get<string>('defaultView', 'preview');
                
                if (defaultView === 'preview') {
                    // Only open preview if not already in custom editor
                    const activeEditor = vscode.window.activeTextEditor;
                    if (activeEditor && activeEditor.document.uri.toString() === document.uri.toString()) {
                        outputChannel.appendLine(`Opening preview for: ${document.uri.fsPath}`);
                        vscode.commands.executeCommand('vscode.openWith', document.uri, 'jrxml-viewer.editor');
                    }
                }
                // If defaultView is 'source', the file is already opened in text editor, so do nothing
            }
        })
    );

    outputChannel.appendLine('===========================================');
    outputChannel.appendLine('JRXML Viewer Extension Activated! ✓');
    outputChannel.appendLine('===========================================');
    outputChannel.show(true); // Show the output channel
}

export function deactivate() {
    outputChannel.appendLine('JRXML Viewer Extension Deactivating...');
    outputChannel.dispose();
}
