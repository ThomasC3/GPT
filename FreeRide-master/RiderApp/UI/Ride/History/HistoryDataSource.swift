//
//  HistoryDataSource.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/22/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class HistoryDataSource: TableDataSource<RideResponse> {

    var location : Location?
        
    override func registerCellIdentifiers(in tableView: UITableView) {
        super.registerCellIdentifiers(in: tableView)
        tableView.registerNib(HistoryTableViewCell.self)
    }

    func refresh(items: [RideResponse]) {
        refresh()

        sections = [Section(rows: items)]
    }

    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let item = value(at: indexPath)

        let cell = tableView.dequeueCell(HistoryTableViewCell.self, for: indexPath)
        cell.configure(with: item, tipsEnabled: location?.tipEnabled ?? true)

        return cell
    }
}
