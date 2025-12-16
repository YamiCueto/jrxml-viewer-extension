import * as vscode from 'vscode';
import { JrxmlEditorProvider } from './jrxmlEditorProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('JRXML Viewer extension is now active');

    // Register the custom editor provider
    const provider = new JrxmlEditorProvider(context);
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

    // Register command to open preview
    context.subscriptions.push(
        vscode.commands.registerCommand('jrxml-viewer.openPreview', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.fileName.endsWith('.jrxml')) {
                vscode.commands.executeCommand('vscode.openWith', editor.document.uri, 'jrxml-viewer.editor');
            } else {
                vscode.window.showInformationMessage('Please open a JRXML file first');
            }
        })
    );
}

export function deactivate() {}
