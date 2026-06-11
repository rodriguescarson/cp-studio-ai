import * as vscode from 'vscode';

/**
 * Centralised access to the AI provider API key.
 *
 * The key is held in VS Code SecretStorage (OS keychain backed), never in
 * settings.json. Earlier versions stored it in the plaintext `codeforces.aiApiKey`
 * setting; getAiApiKey() transparently migrates any such legacy value into
 * SecretStorage and clears the plaintext copy.
 */
const SECRET_KEY = 'codeforces.aiApiKey';

async function clearLegacySetting(): Promise<void> {
    const config = vscode.workspace.getConfiguration('codeforces');
    for (const target of [vscode.ConfigurationTarget.Global, vscode.ConfigurationTarget.Workspace]) {
        try {
            await config.update('aiApiKey', undefined, target);
        } catch {
            // Setting may not be writable at this target; ignore.
        }
    }
}

/** Returns the stored API key (trimmed), or '' if none is configured. */
export async function getAiApiKey(context: vscode.ExtensionContext): Promise<string> {
    const fromSecret = await context.secrets.get(SECRET_KEY);
    if (fromSecret && fromSecret.trim() !== '') {
        return fromSecret.trim();
    }

    // Legacy migration: a key previously saved in plaintext settings.
    const legacy = vscode.workspace.getConfiguration('codeforces').get<string>('aiApiKey', '');
    if (legacy && legacy.trim() !== '') {
        const trimmed = legacy.trim();
        await context.secrets.store(SECRET_KEY, trimmed);
        await clearLegacySetting();
        return trimmed;
    }

    return '';
}

/** Stores (or, when given an empty value, deletes) the API key in SecretStorage. */
export async function setAiApiKey(context: vscode.ExtensionContext, key: string): Promise<void> {
    const trimmed = key.trim();
    if (trimmed === '') {
        await context.secrets.delete(SECRET_KEY);
    } else {
        await context.secrets.store(SECRET_KEY, trimmed);
    }
    // Never leave a plaintext copy behind.
    await clearLegacySetting();
}
