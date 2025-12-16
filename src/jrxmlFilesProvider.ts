import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class JrxmlFilesProvider implements vscode.TreeDataProvider<JrxmlFileItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<JrxmlFileItem | undefined | null | void> = new vscode.EventEmitter<JrxmlFileItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<JrxmlFileItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private workspaceRoot: string) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: JrxmlFileItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: JrxmlFileItem): Thenable<JrxmlFileItem[]> {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage('No JRXML files in empty workspace');
            return Promise.resolve([]);
        }

        if (element) {
            // If it's a folder, return its children
            return Promise.resolve(this.getJrxmlFilesInFolder(element.resourceUri!.fsPath));
        } else {
            // Root level - scan workspace
            return Promise.resolve(this.getJrxmlFilesInFolder(this.workspaceRoot));
        }
    }

    private getJrxmlFilesInFolder(folderPath: string): JrxmlFileItem[] {
        const items: JrxmlFileItem[] = [];

        if (!fs.existsSync(folderPath)) {
            return items;
        }

        const entries = fs.readdirSync(folderPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(folderPath, entry.name);

            // Skip node_modules, .git, out, etc.
            if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'out') {
                continue;
            }

            if (entry.isDirectory()) {
                const childFiles = this.getJrxmlFilesInFolder(fullPath);
                if (childFiles.length > 0) {
                    const folderItem = new JrxmlFileItem(
                        entry.name,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        vscode.Uri.file(fullPath),
                        'folder'
                    );
                    folderItem.children = childFiles;
                    items.push(folderItem);
                }
            } else if (entry.name.endsWith('.jrxml')) {
                items.push(new JrxmlFileItem(
                    entry.name,
                    vscode.TreeItemCollapsibleState.None,
                    vscode.Uri.file(fullPath),
                    'file'
                ));
            }
        }

        return items.sort((a, b) => {
            // Folders first
            if (a.type === 'folder' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'folder') return 1;
            return a.label!.toString().localeCompare(b.label!.toString());
        });
    }
}

export class JrxmlFileItem extends vscode.TreeItem {
    public children?: JrxmlFileItem[];

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly resourceUri: vscode.Uri,
        public readonly type: 'file' | 'folder'
    ) {
        super(label, collapsibleState);

        this.tooltip = resourceUri.fsPath;
        this.contextValue = type;

        if (type === 'file') {
            this.command = {
                command: 'jrxmlFiles.openFile',
                title: 'Open JRXML File',
                arguments: [resourceUri]
            };
            this.iconPath = new vscode.ThemeIcon('file-code');
        } else {
            this.iconPath = new vscode.ThemeIcon('folder');
        }
    }
}
