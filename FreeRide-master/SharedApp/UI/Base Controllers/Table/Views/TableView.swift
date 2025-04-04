//
//  TableView.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/20/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class TableView: UITableView {

    private let emptyView: EmptyView = .instantiateFromNib()

    var emptyImage: UIImage? {
        get { return emptyView.emptyImage }
        set { emptyView.emptyImage = newValue }
    }

    var footerImage: UIImage? {
        get { return emptyView.footerImage }
        set { emptyView.footerImage = newValue }
    }

    var isLoading: Bool {
        get { return emptyView.isLoading }
        set { emptyView.isLoading = newValue }
    }

    var updateHandler: (() -> Void)?

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        initializer()
    }

    override init(frame: CGRect, style: UITableView.Style) {
        super.init(frame: frame, style: style)
        initializer()
    }

    private func initializer() {
        backgroundView = emptyView

        tableFooterView = UIView(frame: .zero)
        tableHeaderView = UIView(frame: .zero)
    }

    override func reloadData() {
        super.reloadData()
        tableViewDidUpdate()
    }

    override func insertSections(_ sections: IndexSet, with animation: UITableView.RowAnimation) {
        super.insertSections(sections, with: animation)
        tableViewDidUpdate()
    }

    override func deleteSections(_ sections: IndexSet, with animation: UITableView.RowAnimation) {
        super.deleteSections(sections, with: animation)
        tableViewDidUpdate()
    }

    override func insertRows(at indexPaths: [IndexPath], with animation: UITableView.RowAnimation) {
        super.insertRows(at: indexPaths, with: animation)
        tableViewDidUpdate()
    }

    override func deleteRows(at indexPaths: [IndexPath], with animation: UITableView.RowAnimation) {
        super.deleteRows(at: indexPaths, with: animation)
        tableViewDidUpdate()
    }

    override func reloadRows(at indexPaths: [IndexPath], with animation: UITableView.RowAnimation) {
        super.reloadRows(at: indexPaths, with: animation)
        tableViewDidUpdate()
    }

    override func moveRow(at indexPath: IndexPath, to newIndexPath: IndexPath) {
        super.moveRow(at: indexPath, to: newIndexPath)
        tableViewDidUpdate()
    }

    func configureEmptyView(title: String? = nil, image: UIImage?) {
        emptyView.title = title
        emptyView.emptyImage = image
    }

    private func tableViewDidUpdate() {
        updateEmptyView()
        updateHandler?()
    }

    private func updateEmptyView() {
        func update(isEmpty: Bool) {
            emptyView.isShowingEmpty = isEmpty && !isLoading
            emptyView.isShowingFooter = !isEmpty && !isLoading
            tableFooterView?.frame.size.height = emptyView.footerHeight

            if !isEmpty {
                isLoading = false
            }
        }

        // FIXME: When DS added
//        if let dataSource = dataSource as? DataSource {
//            update(isEmpty: dataSource.isEmpty)
//            return
//        }

        emptyView.isShowingEmpty = false
        emptyView.isShowingFooter = false
        isLoading = false
        tableFooterView?.frame.size.height = 0
    }
}
