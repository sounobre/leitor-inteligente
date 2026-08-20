package local.leitor.study.infra.api.dto;

import java.util.List;

public record StudySyncResponse(
    List<PreparedBookResponse> books
) {
    public static StudySyncResponse of(List<PreparedBookResponse> books) {
        return new StudySyncResponse(books);
    }
}
