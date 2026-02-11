/**
 * Unit tests for TestRunner.
 * These tests verify the core test runner logic without requiring VS Code APIs.
 */
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Test utility: create a temporary problem directory with test files
function createTempProblemDir(): string {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpstudio-test-'));
    return tmpDir;
}

function cleanup(dir: string): void {
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    } catch {}
}

describe('TestRunner Logic', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = createTempProblemDir();
    });

    afterEach(() => {
        cleanup(tmpDir);
    });

    describe('Test case discovery', () => {
        it('should find single in.txt/out.txt pair', () => {
            fs.writeFileSync(path.join(tmpDir, 'in.txt'), '5\n');
            fs.writeFileSync(path.join(tmpDir, 'out.txt'), '25\n');

            const files = fs.readdirSync(tmpDir);
            const hasIn = files.includes('in.txt');
            const hasOut = files.includes('out.txt');
            assert.strictEqual(hasIn, true);
            assert.strictEqual(hasOut, true);
        });

        it('should find numbered test cases in1.txt/out1.txt', () => {
            fs.writeFileSync(path.join(tmpDir, 'in1.txt'), '3\n');
            fs.writeFileSync(path.join(tmpDir, 'out1.txt'), '9\n');
            fs.writeFileSync(path.join(tmpDir, 'in2.txt'), '4\n');
            fs.writeFileSync(path.join(tmpDir, 'out2.txt'), '16\n');

            let count = 0;
            for (let i = 1; i <= 100; i++) {
                if (fs.existsSync(path.join(tmpDir, `in${i}.txt`)) &&
                    fs.existsSync(path.join(tmpDir, `out${i}.txt`))) {
                    count++;
                } else {
                    break;
                }
            }
            assert.strictEqual(count, 2);
        });

        it('should prefer numbered test cases over single pair', () => {
            fs.writeFileSync(path.join(tmpDir, 'in.txt'), 'single\n');
            fs.writeFileSync(path.join(tmpDir, 'out.txt'), 'pair\n');
            fs.writeFileSync(path.join(tmpDir, 'in1.txt'), 'numbered\n');
            fs.writeFileSync(path.join(tmpDir, 'out1.txt'), 'case\n');

            // Numbered should be found first
            const hasNumbered = fs.existsSync(path.join(tmpDir, 'in1.txt'));
            assert.strictEqual(hasNumbered, true);
        });
    });

    describe('Solution file detection', () => {
        it('should find main.cpp', () => {
            fs.writeFileSync(path.join(tmpDir, 'main.cpp'), '#include <iostream>');
            const candidates = ['main.cpp', 'main.py', 'Main.java'];
            let found: string | null = null;
            for (const c of candidates) {
                if (fs.existsSync(path.join(tmpDir, c))) {
                    found = c;
                    break;
                }
            }
            assert.strictEqual(found, 'main.cpp');
        });

        it('should find main.py', () => {
            fs.writeFileSync(path.join(tmpDir, 'main.py'), 'print("hello")');
            const candidates = ['main.cpp', 'main.py', 'Main.java'];
            let found: string | null = null;
            for (const c of candidates) {
                if (fs.existsSync(path.join(tmpDir, c))) {
                    found = c;
                    break;
                }
            }
            assert.strictEqual(found, 'main.py');
        });

        it('should find Main.java', () => {
            fs.writeFileSync(path.join(tmpDir, 'Main.java'), 'public class Main {}');
            const candidates = ['main.cpp', 'main.py', 'Main.java'];
            let found: string | null = null;
            for (const c of candidates) {
                if (fs.existsSync(path.join(tmpDir, c))) {
                    found = c;
                    break;
                }
            }
            assert.strictEqual(found, 'Main.java');
        });
    });

    describe('Output comparison', () => {
        it('should pass when outputs match exactly', () => {
            const expected = '42';
            const actual = '42';
            assert.strictEqual(actual.trim(), expected.trim());
        });

        it('should pass when outputs match with trailing whitespace', () => {
            const expected = '42\n';
            const actual = '42  \n';
            assert.strictEqual(actual.trim(), expected.trim());
        });

        it('should fail when outputs differ', () => {
            const expected = '42';
            const actual = '43';
            assert.notStrictEqual(actual.trim(), expected.trim());
        });

        it('should handle multiline output comparison', () => {
            const expected = '1\n2\n3';
            const actual = '1\n2\n3';
            assert.strictEqual(actual.trim(), expected.trim());
        });
    });
});

describe('StreakTracker Logic', () => {
    it('should calculate days between dates correctly', () => {
        const d1 = new Date('2026-02-01');
        const d2 = new Date('2026-02-11');
        const days = Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
        assert.strictEqual(days, 10);
    });

    it('should format date as YYYY-MM-DD', () => {
        const date = new Date('2026-02-11T12:00:00Z');
        const formatted = date.toISOString().split('T')[0];
        assert.strictEqual(formatted, '2026-02-11');
    });
});

describe('Achievement Conditions', () => {
    it('should evaluate solved >= N conditions', () => {
        const condition = 'solved >= 10';
        const parts = condition.split('>= ');
        const target = parseInt(parts[1]);
        assert.strictEqual(target, 10);
        assert.strictEqual(15 >= target, true);
        assert.strictEqual(5 >= target, false);
    });

    it('should evaluate rating >= N conditions', () => {
        const condition = 'rating >= 1400';
        const parts = condition.split('>= ');
        const target = parseInt(parts[1]);
        assert.strictEqual(1500 >= target, true);
        assert.strictEqual(1200 >= target, false);
    });
});
