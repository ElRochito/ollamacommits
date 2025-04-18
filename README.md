<div align="center">
  <div>
	 <h1 align="center">Ollama Commits</h1>
  </div>
	<p>A CLI that writes your git commit messages for you with Ollama. Never write a commit message again.</p>
	<a href="https://www.npmjs.com/package/ollamacommits"><img src="https://img.shields.io/npm/v/ollamacommits" alt="Current version"></a>
</div>

---

Based on https://github.com/Nutlope/aicommits

---

## Setup

> The minimum supported version of Node.js is the latest v14. Check your Node.js version with `node --version`.

1. Install _ollamacommits_:

	```sh
	npm install -g ollamacommits
	```


### Upgrading

Check the installed version with:

```
ollamacommits --version
```

If it's not the [latest version](https://github.com/Nutlope/aicommits/releases/latest), run:

```sh
npm update -g ollamacommits
```

## Usage

### CLI mode

You can call `ollamacommits` directly to generate a commit message for your staged changes:

```sh
git add <files...>
ollamacommits
```

`ollamacommits` passes down unknown flags to `git commit`, so you can pass in [`commit` flags](https://git-scm.com/docs/git-commit).

For example, you can stage all changes in tracked files with as you commit:

```sh
ollamacommits --all # or -a
```

> 👉 **Tip:** Use the `ollamac` alias if `ollamacommits` is too long for you.

