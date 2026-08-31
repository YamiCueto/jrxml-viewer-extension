import * as vscode from 'vscode';
import { JrxmlEditorProvider } from './jrxmlEditorProvider';
import { JrxmlFilesProvider } from './jrxmlFilesProvider';
import { JrxmlPropertiesProvider } from './jrxmlPropertiesProvider';
import { JrxmlElementsProvider } from './jrxmlElementsProvider';

export const outputChannel = vscode.window.createOutputChannel('JRXML Viewer');

export function activate(context: vscode.ExtensionContext) {
    outputChannel.appendLine('===========================================');
    outputChannel.appendLine('JRXML Viewer Extension Activating...');
    outputChannel.appendLine(`Time: ${new Date().toLocaleString()}`);
    outputChannel.appendLine('===========================================');

    const config = vscode.workspace.getConfiguration('jrxml-viewer');
    const defaultView = config.get<string>('defaultView', 'preview');
    outputChannel.appendLine(`Default view setting: ${defaultView}`);

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    
    const filesProvider = new JrxmlFilesProvider(workspaceRoot);
    const filesTreeView = vscode.window.createTreeView('jrxmlFiles', {
        treeDataProvider: filesProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(filesTreeView);

    const propertiesProvider = new JrxmlPropertiesProvider();
    const propertiesTreeView = vscode.window.createTreeView('jrxmlProperties', {
        treeDataProvider: propertiesProvider
    });
    context.subscriptions.push(propertiesTreeView);

    outputChannel.appendLine('Creating Elements Navigator tree view...');
    const elementsProvider = new JrxmlElementsProvider();
    const elementsTreeView = vscode.window.createTreeView('jrxmlElements', {
        treeDataProvider: elementsProvider
    });
    context.subscriptions.push(elementsTreeView);

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
            outputChannel.appendLine(`Command: jrxmlElements.revealElement - ${element?.label || element?.id || JSON.stringify(element)}`);
            const targetId = element?.id || (typeof element === 'string' ? element : undefined);
            if (targetId) {
                provider.postMessageToActiveEditor({ command: 'selectElement', elementId: targetId });
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('jrxml-viewer.openSource', (uri?: vscode.Uri) => {
            outputChannel.appendLine('Command: jrxml-viewer.openSource');
            
            if (!uri) {
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && activeEditor.document.fileName.endsWith('.jrxml')) {
                    uri = activeEditor.document.uri;
                } else {
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

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument((document) => {
            if (document.fileName.endsWith('.jrxml')) {
                const config = vscode.workspace.getConfiguration('jrxml-viewer');
                const defaultView = config.get<string>('defaultView', 'preview');
                
                if (defaultView === 'preview') {
                    const activeEditor = vscode.window.activeTextEditor;
                    if (activeEditor && activeEditor.document.uri.toString() === document.uri.toString()) {
                        outputChannel.appendLine(`Opening preview for: ${document.uri.fsPath}`);
                        vscode.commands.executeCommand('vscode.openWith', document.uri, 'jrxml-viewer.editor');
                    }
                }
            }
        })
    );

    outputChannel.appendLine('===========================================');
    outputChannel.appendLine('JRXML Viewer Extension Activated! ✓');
    outputChannel.appendLine('===========================================');
}

export function deactivate() {
    outputChannel.appendLine('JRXML Viewer Extension Deactivating...');
    outputChannel.dispose();
}
