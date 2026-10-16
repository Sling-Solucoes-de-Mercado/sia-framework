# demo-agent

```yaml
agent:
  name: Demo
  id: demo-agent
  title: Agente de demonstração
  icon: 🧪
  whenToUse: Use para testar squads.
commands:
  - name: demo
    task: demo-task.md
    description: 'Executa a task de demonstração'
dependencies:
  tasks: [demo-task.md, next.md]
```
