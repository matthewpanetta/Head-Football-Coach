const express = require('express');
const { dialog, BrowserWindow } = require('electron');

const maddenExporter = require('../madden-exporter');

const router = express.Router();

router.post('/roster', async (req, res) => {
    console.log();
    console.log('request to export roster');

    const saveDialogResult = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow(), {
        title: 'Save Roster Export',
        defaultPath: 'ROSTER-HFCExport'
    });

    if (!saveDialogResult.canceled) {
        await maddenExporter.exportRoster(req.body, saveDialogResult.filePath);
    }

    res.end();
});

module.exports = router;