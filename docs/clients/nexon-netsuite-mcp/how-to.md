# How to connect LangSmith Fleet to NetSuite finance over MCP

This guide is for Nexon. It connects a LangSmith Fleet agent to NetSuite through
the NetSuite AI Connector Service. Part A enables the MCP Standard Tools
SuiteApp. Part B builds a custom finance SuiteApp and sends its tools through
the same connector.

`runtime-architecture.svg` in this folder shows the runtime picture. The
diagram is a proposal, not a test result.

## Status of this guide

Each step cites the vendor documentation that we read on 2026-11-19. A step
marked **Verify** comes from a gap or a conflict in that documentation. Test
each Verify step in a NetSuite sandbox before you use it in production.

| Mark | Meaning |
|---|---|
| (no mark) | The vendor documentation states the step. |
| **Verify** | The documentation is silent or conflicts. Test the step in a sandbox. |
| **Proposal** | A Nexon design choice, such as a name or a tool. |

## 1. Constraints from the documentation

1. The NetSuite AI Connector Service needs a client that supports remote MCP,
   MCP protocol version 2025-06-18, Streamable HTTP, and the OAuth 2.0
   Authorization Code Grant with PKCE.
2. The connector does not accept the Administrator role or a role with full
   permissions. Each tool runs with the permissions of the role that connects.
3. Tool permissions in a custom toolset control only which tools a user sees.
   The NetSuite role still controls which data and actions the user can reach.
4. NetSuite applies a concurrency limit that it shares with other
   integrations. Too many requests fail with "Too Many Requests". An
   administrator can give each integration record its own limit.
5. AI clients usually take about 5,000 rows for each call. Large queries can
   time out.
6. The execution log of the integration record keeps entries for 21 days in
   production and 7 days in a sandbox.
7. A custom tool script cannot use the `N/http`, `N/https`, `N/llm`, or
   `N/sftp` modules. A custom tool cannot call an external API.
8. From the September 2026 minor release, NetSuite does not deploy custom
   tools from the old `tool` XML object. Use the `toolset` SDF object.
9. In Fleet, a change to the URL of a custom MCP server breaks each agent that
   uses tools from that server. You must remove those tools and add them again.
10. LangSmith traces record tool inputs and outputs. Those traces can hold
    finance data. Set the trace retention and access before the first live
    call.

## 2. Part A: enable the MCP Standard Tools SuiteApp

### 2.1 Enable the NetSuite features

1. Go to **Setup > Company > Enable Features**.
2. Open the **SuiteCloud** subtab.
3. Under **SuiteScript**, select **Server SuiteScript**.
4. Select **OAuth 2.0**.
5. Under **SuiteTalk (Web Services)**, select **REST Web Services**. The
   Standard Tools SuiteApp needs this feature before you install it.
6. Click **Save**.

### 2.2 Create the AI finance role

1. Go to **Setup > Users/Roles > Manage Roles**.
2. Create a custom role, for example `Nexon AI Finance` (**Proposal**). Do not
   copy the Administrator role. The connector rejects a role with full
   permissions.
3. On the **Permissions > Setup** subtab, add these permissions:
   - **MCP Server Connection**
   - **Log in using OAuth 2.0 Access Tokens**. Do not confuse it with **Log in
     using Access Tokens**.
   - **REST Web Services**. Add it only if the role must create, get, or
     update records through the Standard Tools.
4. Add the finance permissions that the agent needs, at the lowest level that
   works. For phase 1, give **View** on transactions, reports, and saved
   searches only. **Verify**: the documentation does not list a permission
   level for each Standard Tool. `ns_createRecord` needs **REST Web Services
   (Full)**, and `ns_listSavedSearches` needs **Perform Search (View)**.
5. Give the role access to the SuiteApp folder in the File Cabinet. The tools
   read files from that folder.
6. Assign the role to each finance user who will use the agent.

### 2.3 Install the SuiteApp

1. Open the **SuiteApps** tab. **Verify**: the documentation does not give the
   menu path to this tab.
2. In the **Search SuiteApps** field, enter `MCP Standard Tools`.
3. Click the **MCP Standard Tools** icon.
4. On the details page, click **Install**.
5. Wait until the installation completes.

Oracle manages this SuiteApp and updates it when it releases new features.
Its application ID is `com.netsuite.mcpstandardtools`. It has 25 tools:

| Group | Tools |
|---|---|
| Files | `ns_attachFile`, `ns_detachFile`, `ns_getFolderByPath`, `ns_getIdFromPath`, `ns_getPathFromId`, `ns_searchFiles` |
| Records | `ns_createRecord`, `ns_getRecord`, `ns_getRecordTransformMetadata`, `ns_getRecordTypeMetadata`, `ns_transformRecord`, `ns_updateRecord` |
| Record actions | `ns_getRecordActionMetadata`, `ns_executeRecordAction` |
| Accounting | `ns_getAccountingBooks`, `ns_getAccountingContexts`, `ns_getNexusIds`, `ns_getSubsidiaries` |
| Reports | `ns_listAllReports`, `ns_runReport` |
| Session and searches | `ns_getSessionInfo`, `ns_listSavedSearches`, `ns_runSavedSearch` |
| SuiteQL | `ns_runCustomSuiteQL`, `ns_getSuiteQLMetadata` |

### 2.4 Create the integration record for Fleet

Claude creates its integration record when it first connects. Fleet is not
Claude, so you create the record yourself.

1. Go to **Setup > Integration > Manage Integrations > New**.
2. In **Name**, enter `LangSmith Fleet` (**Proposal**).
3. In **State**, select **Enabled**.
4. On the **Authentication** subtab, under OAuth 2.0, set these fields:

| Field | Value |
|---|---|
| Authorization Code Grant | Selected |
| Redirect URI | `https://<langsmith-host>/host-oauth-callback/<provider-id>` (see 2.5) |
| NetSuite AI Connector Service | Selected |
| Client Credentials (Machine to Machine) Grant | Cleared |
| Token-based Authentication boxes | All cleared |
| RESTlets, REST Web Services, SuiteAnalytics Connect | Cleared |
| OAuth 2.0 Consent Policy | Always Ask (default) or Ask First Time |

5. Choose the client type. The two options are in section 2.5.
6. Click **Save**.
7. Copy the client ID, and the client secret if there is one. NetSuite shows
   them only once.
8. If the record shows a pending state, an administrator must enable it. An
   enabled record cannot go back to pending.
9. Optional: set a **Concurrency Limit** on the record, so that the agent
   cannot use all of the account limit.

The redirect URI must start with `https://` or a custom scheme. NetSuite
rejects `http://`.

### 2.5 Register NetSuite in Fleet

Fleet has two OAuth modes that can match NetSuite. **Verify** both in a
sandbox. The documentation of each vendor does not cover the other vendor.

| Option | NetSuite record | Fleet setting | Open question |
|---|---|---|---|
| A. Manual (recommended) | **Public Client** cleared, so NetSuite issues a secret | **OAuth 2.1 (Manual)**, with an OAuth provider | Does the AI Connector accept a confidential client? |
| B. Auto | **Public Client** and **Dynamic Client Registration** selected | **OAuth 2.1 (Auto)** | Does the Fleet registration request satisfy NetSuite? |

We recommend option A first. Fleet asks for a client secret for a provider,
and the Fleet documentation does not say that the secret is optional. If
option A fails, try option B.

For option A, register the OAuth provider:

1. In Fleet, go to **Settings > OAuth providers**. You need the
   `workspaces:manage` permission.
2. Click **OAuth Provider**, and fill in the fields:

| Field | Value |
|---|---|
| Provider ID | `netsuite-nexon` (**Proposal**). The ID becomes part of the redirect URI. |
| Display Name | `NetSuite (Nexon)` |
| Client ID, Client Secret | The values from step 2.4.7 |
| Grant Type | Authorization Code |
| Authorization URL | **Verify**: take it from the NetSuite OAuth 2.0 documentation for your account. |
| Token URL | **Verify**: take it from the NetSuite OAuth 2.0 documentation for your account. |
| Enable PKCE | On. Fleet lists only providers with PKCE for a manual MCP server. |

3. Put the redirect URI `https://<langsmith-host>/host-oauth-callback/netsuite-nexon`
   into the NetSuite integration record from section 2.4.

### 2.6 Add the Standard Tools server to Fleet

1. In Fleet, go to **Settings > MCP servers** and click **Add server**. You can
   also use **Fleet > Integrations > + Custom MCP**. Both add the server for
   the whole workspace. To add it to one agent only, use the agent's
   **Connections** drawer, then **Add connection > + Add custom MCP**.
2. In **Name**, enter `ns-standard`.
3. In **URL**, enter
   `https://<accountid>.suitetalk.api.netsuite.com/services/mcp/v1/suiteapp/com.netsuite.mcpstandardtools`.
4. In **Authentication**, select **OAuth 2.1 (Manual)** and the
   `netsuite-nexon` provider. For option B, select **OAuth 2.1 (Auto)**.
5. Click **Save server**. Fleet then discovers the tools.

**Verify** the URL. The NetSuite FAQ says that a connection without `/all` at
the end appears disconnected. The connect page documents the
`/suiteapp/<applicationid>` form. If the SuiteApp URL fails, use
`https://<accountid>.suitetalk.api.netsuite.com/services/mcp/v1/all`. That URL
returns the custom tools from all SuiteApps and account customization projects.

### 2.7 Set the tool approvals and test

1. Open the finance agent, and expand the **Connections** drawer.
2. Set each read tool to **Auto**.
3. Set each write tool to **Ask**. The write tools are `ns_createRecord`,
   `ns_updateRecord`, `ns_transformRecord`, `ns_executeRecordAction`,
   `ns_attachFile`, and `ns_detachFile`. The agent then pauses until a person
   clicks **Accept** or **Reject**.
4. As a finance user, send the agent a message that needs NetSuite. Fleet asks
   you to sign in to NetSuite once. Pick the `Nexon AI Finance` role.
5. Ask for something small, such as the list of subsidiaries. The agent calls
   `ns_getSubsidiaries`.
6. In NetSuite, open the integration record and read its **Execution Log**.
   Confirm that the call appears there.

## 3. Part B: build the custom finance SuiteApp

### 3.1 What a custom tool needs

A custom tool has three files:

| File | Job |
|---|---|
| SuiteScript 2.1 script | Holds the logic. Each tool is an `async` function that the script returns. |
| JSON-RPC schema | Tells the AI client the name, description, inputs, and outputs of each tool. |
| `toolset` SDF object | Joins the script and the schema, exposes the tools to the connector, and sets the permissions that make a tool visible. |

You also need these NetSuite features: **Server SuiteScript**, **OAuth 2.0**,
and **SuiteCloud Development Framework (SDF)**. You need the SuiteCloud CLI or
a SuiteCloud IDE plug-in.

### 3.2 Pick the first tools

Each tool must do one finance job, with narrow inputs. These tools are a
**Proposal** for phase 1 and phase 2:

| Tool | Phase | Reads or writes | Approval in Fleet |
|---|---|---|---|
| `get_open_invoices` | 1 | Reads | Auto |
| `get_aged_receivables` | 1 | Reads | Auto |
| `gl_balance_inquiry` | 1 | Reads | Auto |
| `vendor_bill_lookup` | 1 | Reads | Auto |
| `propose_journal_entry` | 2 | Writes a journal in Pending Approval | Ask |

Put the guardrails into the code, not into the prompt. For example, cap the
rows, check each input, and refuse a date range longer than one year.

### 3.3 Create the SuiteCloud project

1. Install the SuiteCloud CLI: `npm install -g @oracle/suitecloud-cli`.
2. Run `suitecloud project:create -i`. Pick a SuiteApp project. Use the
   publisher ID `com.nexon` and the project ID `financetools` (**Proposal**).
   The application ID is then `com.nexon.financetools`.
3. Run `suitecloud account:setup -i`, and link the project to the sandbox.

The CLI commands come from the SuiteCloud CLI reference. The custom tool pages
do not name them. **Verify** them against your CLI version.

Use this layout. The `FileCabinet` and `Objects` folders are standard in an
SDF project. The file names are a **Proposal**.

```
financetools/
  manifest.xml
  deploy.xml
  src/
    FileCabinet/SuiteApps/com.nexon.financetools/tools/
      financetools.js
      financetools_schema.json
    Objects/
      custtoolset_nexon_finance.xml
```

### 3.4 Write the script

The JSDoc tags, the `define` call, the `async` functions, and the `result` and
`error` fields follow the Oracle code samples. The SuiteQL is a **Proposal**.
**Verify** each field name with `ns_getSuiteQLMetadata` before you deploy.

```javascript
/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType CustomTool
 */
define(['N/query'], function (query) {
  const MAX_ROWS = 200;

  return {
    get_open_invoices: async function (args) {
      try {
        const customerId = Number(args['customer_id']);
        if (!Number.isInteger(customerId) || customerId <= 0) {
          return { result: '', error: 'customer_id must be a positive whole number' };
        }
        const rows = query.runSuiteQL({
          query:
            'SELECT t.tranid, t.trandate, t.duedate, ' +
            'BUILTIN.DF(t.entity) AS customer, t.foreignamountremaining ' +
            "FROM transaction t WHERE t.type = 'CustInvc' " +
            'AND t.entity = ? AND t.foreignamountremaining > 0 ' +
            'ORDER BY t.duedate',
          params: [customerId]
        }).asMappedResults().slice(0, MAX_ROWS);
        return { result: JSON.stringify(rows) };
      } catch (e) {
        return { result: '', error: 'There was an error executing the tool: ' + e };
      }
    }
  };
});
```

The script uses `N/query` only. It must not use `N/http`, `N/https`, `N/llm`,
or `N/sftp`.

### 3.5 Write the JSON-RPC schema

Each `name` must match a function that the script returns. An input property
can be a `string`, a `number`, or a `boolean`. NetSuite rejects a schema that
is not valid JSON, or that uses a property the documentation does not list.

```json
{
  "tools": [
    {
      "name": "get_open_invoices",
      "description": "List open customer invoices for one customer, oldest due date first. Read-only. Returns at most 200 rows.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "customer_id": {
            "type": "number",
            "description": "NetSuite internal ID of the customer"
          }
        },
        "required": ["customer_id"]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "result": { "type": "string" },
          "error": { "type": "string" }
        },
        "required": ["result"]
      },
      "annotations": {
        "title": "Open invoices for a customer",
        "readOnlyHint": true,
        "idempotentHint": true,
        "openWorldHint": false
      }
    }
  ]
}
```

Set `readOnlyHint` to `true` on each read tool. NetSuite sets
`destructiveHint` to `true` by default, so a write tool without hints reads as
destructive.

### 3.6 Write the toolset object

The `scriptid` must start with `custtoolset_` and match the file name. Paths
sit in square brackets.

```xml
<toolset scriptid="custtoolset_nexon_finance">
  <name>Nexon Finance Tools</name>
  <scriptfile>[/SuiteApps/com.nexon.financetools/tools/financetools.js]</scriptfile>
  <rpcschema>[/SuiteApps/com.nexon.financetools/tools/financetools_schema.json]</rpcschema>
  <exposetoaiconnector>T</exposetoaiconnector>
  <permissions>
    <permission>
      <permkey>TRAN_CUSTINVC</permkey>
      <permlevel>VIEW</permlevel>
    </permission>
  </permissions>
</toolset>
```

A user sees a tool only when the role has every permission in this list.
**Verify** the permission key `TRAN_CUSTINVC`. The Oracle sample uses other
keys, and the pages that we read do not list the key for invoices.

### 3.7 Write the manifest and the deploy file

**Verify** both files against the SDF documentation. The custom tool pages do
not show them. The structure below is the usual SDF form.

```xml
<manifest projecttype="SUITEAPP">
  <publisherid>com.nexon</publisherid>
  <projectid>financetools</projectid>
  <projectname>Nexon Finance Tools</projectname>
  <projectversion>1.0.0</projectversion>
  <dependencies>
    <features>
      <feature required="true">SERVERSIDESCRIPTING</feature>
    </features>
  </dependencies>
</manifest>
```

```xml
<deploy>
  <files>
    <path>~/FileCabinet/SuiteApps/com.nexon.financetools/*</path>
  </files>
  <objects>
    <path>~/Objects/*</path>
  </objects>
</deploy>
```

### 3.8 Deploy to the sandbox

1. Run `suitecloud project:validate --server`.
2. Run `suitecloud project:deploy`.
3. In NetSuite, go to **Customization > Scripting > Custom Tools**. Confirm
   that `Nexon Finance Tools` shows `get_open_invoices`.

After the deploy, you cannot edit the script or the schema in the File
Cabinet. Change them in the project and deploy again.

### 3.9 Route the custom tools through the connector to Fleet

1. In Fleet, add a second server, as in section 2.6.
2. In **Name**, enter `ns-finance`.
3. In **URL**, enter
   `https://<accountid>.suitetalk.api.netsuite.com/services/mcp/v1/suiteapp/com.nexon.financetools`.
4. In **Authentication**, select the same provider as for `ns-standard`. Both
   servers use the same NetSuite integration record and the same role.
5. Click **Save server**, and confirm that Fleet lists `get_open_invoices`.
6. Add the tool to the finance agent, and set it to **Auto**.
7. Ask the agent for the open invoices of one test customer. Compare the
   answer with a NetSuite saved search.

The **Verify** note in section 2.6 also applies here. If you use the `/all`
URL instead, add only one NetSuite server to Fleet. **Verify** whether `/all`
includes the Standard Tools.

### 3.10 Test the role before production

1. Sign in to the sandbox with the `Nexon AI Finance` role.
2. Call each tool with valid inputs, with bad inputs, and with data that the
   role must not see.
3. Confirm that each bad call returns `error` and changes no data.
4. Keep the results with the change record.
5. Deploy the same project to production with the same commands.

## 4. Phase 2: writes with approval

1. Turn on journal approval in NetSuite. **Verify** the preference name for
   your account. The pages that we read do not cover it.
2. Build `propose_journal_entry` to save each journal in Pending Approval.
   The tool must never post a journal.
3. Set the tool to **Ask** in Fleet. A person then approves the call in Fleet,
   and a finance approver posts the journal in NetSuite.
4. Add a FastAPI MCP gateway only if the agent must join NetSuite data with
   data from other systems. A custom tool cannot call an external API.

## 5. Sources

- [NetSuite AI Connector Service FAQ](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_4160616848.html)
- [Connect to the NetSuite AI Connector Service](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_0714082142.html)
- [Required Features and Permissions](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_0714080625.html)
- [Installing the MCP Standard Tools SuiteApp](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_0902023450.html)
- [MCP Standard Tools SuiteApp](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_143403258.html)
- [Integration record fields](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_157771733782.html)
- [Creating Custom Tools](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_162020236.html)
- [Custom Tool Script Requirements](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/subsect_13192014863.html)
- [Custom Tool JSON Schema](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/subsect_0822091327.html)
- [Custom Tool Code Samples](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_0724092648.html)
- [Custom Tool Scripts as XML Definitions](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_0825085154.html)
- [LangSmith Fleet: remote MCP servers](https://docs.langchain.com/langsmith/fleet/remote-mcp-servers)
- [LangSmith Fleet: essentials (human-in-the-loop)](https://docs.langchain.com/langsmith/fleet/essentials)
