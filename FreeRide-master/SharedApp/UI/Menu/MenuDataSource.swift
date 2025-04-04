//
//  MenuDataSource.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/21/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class MenuDataSource: TableDataSource<MenuItem> {

    var items = [MenuItem]()

    override func registerCellIdentifiers(in tableView: UITableView) {
        super.registerCellIdentifiers(in: tableView)

        tableView.registerNib(MenuTableViewCell.self)
    }

    func refresh(items: [MenuItem]) {
        refresh()

        sections = [Section(rows: items)]
    }

    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let item = value(at: indexPath)

        let cell = tableView.dequeueCell(MenuTableViewCell.self, for: indexPath)
        cell.configure(with: item)

        return cell
    }
}
